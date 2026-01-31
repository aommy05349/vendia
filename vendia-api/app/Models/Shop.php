<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    protected $fillable = [
        'name',
        'address',
        'phone',
        'tax_id',
        'email',
        'website',
        'footer_text',
        'logo_path',
    ];
}
