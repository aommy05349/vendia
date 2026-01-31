<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    protected $fillable = [
        'name',
        'company_name',
        'address',
        'phone',
        'tax_id',
        'email',
        'website',
        'footer_text',
        'remarks',
        'logo_path',
    ];
}
