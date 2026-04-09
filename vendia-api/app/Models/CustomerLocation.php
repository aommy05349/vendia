<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerLocation extends Model
{
    use HasFactory;

    protected $fillable = [
        'customer_id',
        'name',
        'address',
        'latitude',
        'longitude',
        'google_maps_link',
        'contact_person',
        'contact_phone',
        'is_default',
    ];

    protected $casts = [
        'is_default' => 'boolean',
        'latitude' => 'decimal:8',
        'longitude' => 'decimal:8',
    ];

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function user()
    {
        return $this->customer();
    }
}
