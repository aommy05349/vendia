<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'customer_id',
        'parent_id',
        'job_location_id',
        'job_address',
        'job_google_maps_link',
        'job_contact_person',
        'job_contact_phone',
        'billing_location_id',
        'billing_address',
        'billing_attention',
        'subtotal',
        'tax_mode',
        'vat_rate',
        'vat_amount',
        'withholding_rate',
        'withholding_amount',
        'total',
        'status',
        'payment_method',
        'quotation_number',
        'quotation_status',
        'billing_note_number',
        'billing_note_status',
        'invoice_number',
        'invoice_status',
        'receipt_number',
        'receipt_status',
    ];

    public function parent()
    {
        return $this->belongsTo(Order::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(Order::class, 'parent_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function customer()
    {
        return $this->belongsTo(Customer::class, 'customer_id');
    }

    public function jobLocation()
    {
        return $this->belongsTo(CustomerLocation::class, 'job_location_id');
    }

    public function billingLocation()
    {
        return $this->belongsTo(CustomerLocation::class, 'billing_location_id');
    }

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    public function appointments()
    {
        return $this->hasMany(Appointment::class);
    }

    public function documents()
    {
        return $this->hasMany(Document::class);
    }

    public function paymentPlan()
    {
        return $this->hasOne(OrderPaymentPlan::class);
    }

    public function payments()
    {
        return $this->hasMany(OrderPayment::class);
    }
}
