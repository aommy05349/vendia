<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CustomerLocation extends Model
{
    protected $fillable = [
        'user_id',
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

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
