<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'first_name',
        'last_name',
        'company_name',
        'is_company',
        'contact_name',
        'phone',
        'email',
        'address',
        'tax_id',
        'line_id',
    ];

    protected function casts(): array
    {
        return [
            'is_company' => 'boolean',
        ];
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function locations()
    {
        return $this->hasMany(CustomerLocation::class);
    }
}
