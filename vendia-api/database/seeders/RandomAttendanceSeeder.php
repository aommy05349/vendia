<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\User;
use Illuminate\Database\Seeder;
use Carbon\Carbon;

class RandomAttendanceSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $technicians = User::where('role', 'technician')->get();
        if ($technicians->isEmpty()) {
             $technicians = User::factory()->count(10)->create(['role' => 'technician']);
        }

        // Generate data for current month (Feb 2026) and previous month (Jan 2026)
        // Environment says Today is 2026-02-11.
        
        $startDate = Carbon::now()->startOfMonth()->subMonth(); // Start from Jan 1st
        $endDate = Carbon::now();

        foreach ($technicians as $tech) {
            $currentDate = $startDate->copy();
            
            while ($currentDate <= $endDate) {
                // Skip if record exists to avoid duplicates
                if (Attendance::where('user_id', $tech->id)->where('date', $currentDate->format('Y-m-d'))->exists()) {
                    $currentDate->addDay();
                    continue;
                }

                $isSunday = $currentDate->isSunday();
                
                if ($isSunday) {
                    Attendance::create([
                        'user_id' => $tech->id,
                        'date' => $currentDate->format('Y-m-d'),
                        'status' => 'weekly_off',
                        'check_in' => $currentDate->copy()->setTime(0, 0, 0),
                        'check_out' => $currentDate->copy()->setTime(23, 59, 59),
                    ]);
                } else {
                    // Randomize status
                    $rand = rand(1, 100);
                    
                    if ($rand <= 5) {
                         Attendance::create([
                            'user_id' => $tech->id,
                            'date' => $currentDate->format('Y-m-d'),
                            'status' => 'absent',
                            'check_in' => $currentDate->copy()->setTime(0, 0, 0),
                            'check_out' => $currentDate->copy()->setTime(23, 59, 59),
                            'reason' => 'Sick leave or personal',
                        ]);
                    } else {
                        // Working
                        // Random check-in between 08:00 and 09:30
                        $checkInTime = $currentDate->copy()->setTime(8, 0, 0)->addMinutes(rand(0, 90));
                        
                        // Random check-out between 17:00 and 19:00
                        $checkOutTime = $currentDate->copy()->setTime(17, 0, 0)->addMinutes(rand(0, 120));
                        
                        $status = 'working';
                        
                        // If check in after 9:00, strictly it's late, but let's keep 'working' to match factory default for now.
                        // The dashboard logic seems to handle 'working' fine for display.

                        // Special handling for TODAY
                        if ($currentDate->isToday()) {
                             // If it's today, we want some active technicians for the "Live Monitor"
                             $checkOutTime = null; // Still working
                             // Maybe 20% have checked out (early?) or not relevant if it's morning. 
                             // Let's keep them all checked in for maximum "Live Monitor" effect.
                        } else {
                             // Past days: use 'completed' if that helps with the history table colors
                             // based on `record.status === 'completed' ? 'bg-success'` in AttendanceHistory.tsx
                             $status = 'completed'; 
                        }

                        Attendance::create([
                            'user_id' => $tech->id,
                            'date' => $currentDate->format('Y-m-d'),
                            'check_in' => $checkInTime,
                            'check_out' => $checkOutTime,
                            'status' => $status,
                        ]);
                    }
                }
                
                $currentDate->addDay();
            }
        }
    }
}
