<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AppointmentAssignee extends Model
{
    protected $fillable = [
        'appointment_id',
        'user_id',
        'is_lead',
    ];

    protected $casts = [
        'is_lead' => 'boolean',
    ];

    public function appointment()
    {
        return $this->belongsTo(Appointment::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
