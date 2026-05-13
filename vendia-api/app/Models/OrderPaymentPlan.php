<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class OrderPaymentPlan extends Model
{
    use HasFactory;

    protected $fillable = [
        'order_id',
        'total',
        'down_payment',
        'installment_count',
        'installment_amount',
        'start_date',
        'due_day',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'total' => 'decimal:2',
            'down_payment' => 'decimal:2',
            'installment_amount' => 'decimal:2',
            'start_date' => 'date',
            'installment_count' => 'integer',
            'due_day' => 'integer',
        ];
    }

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function payments()
    {
        return $this->hasMany(OrderPayment::class);
    }
}

