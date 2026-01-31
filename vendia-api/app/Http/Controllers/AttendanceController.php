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
        // Ensure only admin/staff can access this? The route middleware will handle auth, 
        // but maybe we should check role here too? 
        // For now, let's assume the frontend protects the view and API just serves data.
        
        $technicians = User::where('role', 'technician')->get();
        
        $data = $technicians->map(function($tech) {
            $activeSession = Attendance::where('user_id', $tech->id)
                ->whereNull('check_out')
                ->latest()
                ->first();
                
            $lastSession = null;
            if (!$activeSession) {
                $lastSession = Attendance::where('user_id', $tech->id)
                    ->latest()
                    ->first();
            }
            
            return [
                'user' => $tech,
                'status' => $activeSession ? 'working' : 'offline',
                'check_in' => $activeSession ? $activeSession->check_in : null,
                'last_seen' => $lastSession ? $lastSession->check_out ?? $lastSession->check_in : null,
            ];
        });
        
        return response()->json($data);
    }

    public function history($userId)
    {
        $attendances = Attendance::where('user_id', $userId)
            ->latest()
            ->paginate(10); // Paginate history

        return response()->json($attendances);
    }
}
