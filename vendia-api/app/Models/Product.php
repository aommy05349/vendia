<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Product extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'price',
        'stock',
        'sku',
        'category_id',
        'warehouse_id',
        'brand_id',
        'unit_id',
        'barcode_symbology',
        'barcode',
        'product_type',
        'tax_type',
        'tax_amount',
        'discount_type',
        'discount_value',
        'quantity_alert',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function warehouse()
    {
        return $this->belongsTo(Warehouse::class);
    }

    public function brand()
    {
        return $this->belongsTo(Brand::class);
    }

    public function unit()
    {
        return $this->belongsTo(Unit::class);
    }

    public function images()
    {
        return $this->hasMany(ProductImage::class);
    }

    public function bundleItems()
    {
        return $this->belongsToMany(Product::class, 'product_bundles', 'parent_id', 'child_id')
                    ->withPivot('quantity')
                    ->withTimestamps();
    }
}
