<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shop extends Model
{
    protected $fillable = [
        'name',
        'company_name',
        'bank_details',
        'address',
        'phone',
        'tax_id',
        'email',
        'website',
        'footer_text',
        'remarks',
        'bank_details',
        'logo_path',
        'signature_path',
        'authorized_signatory_name',
        'attendance_office_ips',
    ];
}
