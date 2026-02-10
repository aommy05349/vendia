<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductImage extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'image_path', 'is_cover'];

    protected $casts = [
        'is_cover' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
