<?php

namespace App\Http\Controllers;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Auth;

class AttendanceController extends Controller
{
    public function index(Request $request)
    {
        $query = Attendance::with('user')->latest();

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('date')) {
            $query->whereDate('date', $request->date);
        }

        if ($request->has('start_date')) {
            $query->whereDate('date', '>=', $request->start_date);
        }

        if ($request->has('end_date')) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        if ($request->has('per_page')) {
            return $query->paginate($request->per_page);
        }

        return $query->paginate(20);
    }

    public function checkIn(Request $request)
    {
        $user = Auth::user();
        
        // Check if already checked in (any active session)
        $existing = Attendance::where('user_id', $user->id)
            ->whereNull('check_out')
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Already checked in', 'data' => $existing], 400);
        }

        $attendance = Attendance::create([
            'user_id' => $user->id,
            'check_in' => Carbon::now(),
            'date' => Carbon::today(),
            'status' => 'working',
        ]);

        return response()->json($attendance, 201);
    }

    public function checkOut(Request $request)
    {
        $user = Auth::user();

        // Find active session
        $attendance = Attendance::where('user_id', $user->id)
            ->whereNull('check_out')
            ->latest()
            ->first();

        if (!$attendance) {
            return response()->json(['message' => 'No active check-in found'], 400);
        }

        $attendance->update([
            'check_out' => Carbon::now(),
            'status' => 'completed',
        ]);

        return response()->json($attendance);
    }

    public function currentStatus(Request $request)
    {
        $user = Auth::user();

        // Check for active session first
        $active = Attendance::where('user_id', $user->id)
            ->whereNull('check_out')
            ->latest()
            ->first();

        if ($active) {
            return response()->json(['status' => 'checked_in', 'data' => $active]);
        }

        // If no active session, get the last completed session for today
        $lastToday = Attendance::where('user_id', $user->id)
            ->where('date', Carbon::today())
            ->latest()
            ->first();

        return response()->json(['status' => 'checked_out', 'data' => $lastToday]);
    }

    public function overview(Request $request)
    {
        $technicians = User::where('role', 'technician')->get();
        
        $data = $technicians->map(function($tech) {
            // Check for today's attendance record
            $todayAttendance = Attendance::where('user_id', $tech->id)
                ->whereDate('date', Carbon::today())
                ->latest()
                ->first();

            $activeSession = Attendance::where('user_id', $tech->id)
                ->whereNull('check_out')
                ->where('status', '!=', 'absent')
                ->latest()
                ->first();
                
            $lastSession = null;
            if (!$activeSession && !$todayAttendance) {
                $lastSession = Attendance::where('user_id', $tech->id)
                    ->latest()
                    ->first();
            }

            // Weekly Stats
            $startOfWeek = Carbon::now()->startOfWeek();
            $endOfWeek = Carbon::now()->endOfWeek();

            $weeklyOffCount = Attendance::where('user_id', $tech->id)
                ->whereBetween('date', [$startOfWeek, $endOfWeek])
                ->where(function($q) {
                    $q->where('status', 'weekly_off')
                      ->orWhere(function($sub) {
                          $sub->where('status', 'absent')
                              ->where('reason', 'วันหยุดประจำสัปดาห์');
                      });
                })
                ->count();
            
            // Determine status
            $status = 'offline';
            $reason = null;

            if ($todayAttendance && ($todayAttendance->status === 'absent' || $todayAttendance->status === 'weekly_off')) {
                $status = $todayAttendance->status;
                $reason = $todayAttendance->reason;
            } elseif ($activeSession) {
                $status = 'working';
            } elseif ($todayAttendance && $todayAttendance->check_out) {
                 // Already finished work for today
                 $status = 'completed';
            }

            return [
                'user' => $tech,
                'status' => $status,
                'reason' => $reason,
                'check_in' => $activeSession ? $activeSession->check_in : ($todayAttendance ? $todayAttendance->check_in : null),
                'last_seen' => $lastSession ? $lastSession->check_out ?? $lastSession->check_in : null,
                'weekly_off_count' => $weeklyOffCount,
            ];
        });
        
        return response()->json($data);
    }

    public function markAbsent(Request $request)
    {
        // Only admin can mark absent
        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'reason' => 'required|string',
            'date' => 'nullable|date',
            'status' => 'nullable|string|in:absent,weekly_off',
        ]);

        $date = $request->date ? Carbon::parse($request->date) : Carbon::today();
        $status = $request->status ?? 'absent';

        // Check if record exists for this date
        $existing = Attendance::where('user_id', $request->user_id)
            ->whereDate('date', $date)
            ->first();

        if ($existing) {
             // If already working/completed, maybe we shouldn't overwrite? 
             // Or assume admin knows best. Let's update it.
             $existing->update([
                 'status' => $status,
                 'reason' => $request->reason,
                 'check_in' => $date->startOfDay(), // Placeholder
                 'check_out' => $date->endOfDay(),   // Placeholder
             ]);
             return response()->json($existing);
        }

        $attendance = Attendance::create([
            'user_id' => $request->user_id,
            'date' => $date,
            'check_in' => $date->startOfDay(), // Need non-null for constraint? Migration says check_in is timestamp, not nullable.
            'check_out' => $date->endOfDay(),
            'status' => $status,
            'reason' => $request->reason,
        ]);

        return response()->json($attendance);
    }

    public function history($userId)
    {
        $attendances = Attendance::where('user_id', $userId)
            ->latest()
            ->paginate(10); // Paginate history

        return response()->json($attendances);
    }

    public function summary(Request $request)
    {
        $query = Attendance::query();

        if ($request->has('user_id') && $request->user_id) {
            $query->where('user_id', $request->user_id);
        }

        if ($request->has('start_date') && $request->start_date) {
            $query->whereDate('date', '>=', $request->start_date);
        }

        if ($request->has('end_date') && $request->end_date) {
            $query->whereDate('date', '<=', $request->end_date);
        }

        // Clone query for different stats to avoid interference
        $workingQuery = clone $query;
        $absentQuery = clone $query;

        // 1. Working Days & Hours
        $workingRecords = $workingQuery->whereIn('status', ['working', 'completed'])->get();
        $daysWorked = $workingRecords->unique('date')->count();
        
        $totalMinutes = 0;
        foreach ($workingRecords as $record) {
            if ($record->check_out && $record->check_in) {
                $start = Carbon::parse($record->check_in);
                $end = Carbon::parse($record->check_out);
                $totalMinutes += abs($end->diffInMinutes($start));
            }
        }
        $totalHours = round($totalMinutes / 60, 2);

        // 2. Absent Days (No Reason / Other Reason)
        // We defined "Absent without reason" as status='absent' AND reason != 'วันหยุดประจำสัปดาห์'
        $absentRecords = $absentQuery->whereIn('status', ['absent', 'weekly_off'])->get();
        
        $weeklyOffDays = $absentRecords->where('status', 'weekly_off')->count() 
                       + $absentRecords->where('status', 'absent')->where('reason', 'วันหยุดประจำสัปดาห์')->count();
                       
        $absentDays = $absentRecords->where('status', 'absent')->where('reason', '!=', 'วันหยุดประจำสัปดาห์')->count();

        return response()->json([
            'days_worked' => $daysWorked,
            'total_hours' => $totalHours,
            'absent_days' => $absentDays,
            'weekly_off_days' => $weeklyOffDays,
        ]);
    }

    public function update(Request $request, $id)
    {
        // Only admin can update attendance
        if (Auth::user()->role !== 'admin') {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'check_in' => 'required|date',
            'check_out' => 'nullable|date|after_or_equal:check_in',
            'status' => 'nullable|string|in:working,completed,absent,weekly_off',
            'reason' => 'nullable|string',
        ]);

        $attendance = Attendance::findOrFail($id);
        
        $attendance->update([
            'check_in' => Carbon::parse($request->check_in),
            'check_out' => $request->check_out ? Carbon::parse($request->check_out) : null,
            'status' => $request->status ?? $attendance->status,
            'reason' => $request->reason,
        ]);

        return response()->json($attendance);
    }
}
