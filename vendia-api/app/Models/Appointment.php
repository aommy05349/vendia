<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Appointment extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'team_id',
        'order_id',
        'title',
        'description',
        'status',
        'start_time',
        'end_time',
        'location_name',
        'address',
        'latitude',
        'longitude',
        'google_maps_link',
        'contact_name',
        'contact_phone',
        'admin_notes',
        'technician_notes',
    ];

    protected $casts = [
        'start_time' => 'datetime',
        'end_time' => 'datetime',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function team()
    {
        return $this->belongsTo(Team::class);
    }

    public function assignees()
    {
        return $this->hasMany(AppointmentAssignee::class);
    }

    public function technicians()
    {
        return $this->belongsToMany(User::class, 'appointment_assignees')
                    ->withPivot('is_lead')
                    ->withTimestamps();
    }
}
