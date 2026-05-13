<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Document extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'order_payment_id',
        'type',
        'number',
        'status',
        'issued_date',
        'show_issued_date',
        'expires_date',
        'show_expires_date',
        'customer_name',
        'customer_address',
        'customer_attention',
        'header_title',
        'header_subtitle',
        'remarks',
    ];

    protected function casts(): array
    {
        return [
            'issued_date' => 'date',
            'show_issued_date' => 'boolean',
            'expires_date' => 'date',
            'show_expires_date' => 'boolean',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function orderPayment()
    {
        return $this->belongsTo(OrderPayment::class, 'order_payment_id');
    }
}
