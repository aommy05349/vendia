<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductController extends Controller
{
    private function isExternalUrl(?string $value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }

    public function index(Request $request)
    {
        $query = Product::with(['category', 'brand', 'unit', 'warehouse', 'images', 'bundleItems']);

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('sku', 'like', "%{$search}%")
                  ->orWhere('barcode', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $sortField = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');
        
        $allowedSorts = ['name', 'price', 'created_at', 'stock'];
        if (in_array($sortField, $allowedSorts)) {
            $query->orderBy($sortField, $sortOrder);
        }

        $perPage = $request->input('per_page', 10);
        return $query->paginate($perPage);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'slug' => 'nullable|string|unique:products,slug',
            'description' => 'nullable|string',
            'price' => 'required|numeric|min:0',
            'stock' => 'required|integer|min:0',
            'sku' => 'required|string|unique:products,sku',
            'category_id' => 'nullable|exists:categories,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'brand_id' => 'nullable|exists:brands,id',
            'unit_id' => 'nullable|exists:units,id',
            'barcode_symbology' => 'nullable|string',
            'barcode' => 'nullable|string|unique:products,barcode',
            'product_type' => 'in:single,variable,bundle,service',
            'tax_type' => 'in:exclusive,inclusive',
            'tax_amount' => 'numeric|min:0',
            'discount_type' => 'in:fixed,percentage',
            'discount_value' => 'numeric|min:0',
            'quantity_alert' => 'integer|min:0',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
            'image_urls' => 'nullable|array',
            'image_urls.*' => 'required|string|max:2048',
            'bundle_items' => 'required_if:product_type,bundle|array',
            'bundle_items.*.id' => 'required_if:product_type,bundle|exists:products,id',
            'bundle_items.*.quantity' => 'required_if:product_type,bundle|integer|min:1',
        ]);

        if (empty($validated['slug'])) {
            $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(5);
        }

        $product = Product::create($validated);

        if (($validated['product_type'] ?? 'single') === 'bundle' && $request->has('bundle_items')) {
            $syncData = [];
            foreach ($request->bundle_items as $item) {
                $syncData[$item['id']] = ['quantity' => $item['quantity']];
            }
            $product->bundleItems()->sync($syncData);
        }

        if ($request->hasFile('images')) {
            $isFirst = true;
            foreach ($request->file('images') as $image) {
                $path = $image->store('products', 'public');
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => Storage::url($path),
                    'is_cover' => $isFirst,
                ]);
                $isFirst = false;
            }
        }

        if ($request->filled('image_urls') && is_array($request->image_urls)) {
            $hasImages = $product->images()->exists();
            foreach ($request->image_urls as $url) {
                if (!is_string($url) || trim($url) === '') {
                    continue;
                }
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => trim($url),
                    'is_cover' => !$hasImages,
                ]);
                $hasImages = true;
            }
        }

        return response()->json($product->load(['category', 'brand', 'unit', 'warehouse', 'images', 'bundleItems']), 201);
    }

    public function show(Product $product)
    {
        return $product->load(['category', 'brand', 'unit', 'warehouse', 'images', 'bundleItems']);
    }

    public function update(Request $request, Product $product)
    {
        $validated = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => 'nullable|string|unique:products,slug,' . $product->id,
            'description' => 'nullable|string',
            'price' => 'sometimes|required|numeric|min:0',
            'stock' => 'sometimes|required|integer|min:0',
            'sku' => 'sometimes|required|string|unique:products,sku,' . $product->id,
            'category_id' => 'nullable|exists:categories,id',
            'warehouse_id' => 'nullable|exists:warehouses,id',
            'brand_id' => 'nullable|exists:brands,id',
            'unit_id' => 'nullable|exists:units,id',
            'barcode_symbology' => 'nullable|string',
            'barcode' => 'nullable|string|unique:products,barcode,' . $product->id,
            'product_type' => 'in:single,variable,bundle,service',
            'tax_type' => 'in:exclusive,inclusive',
            'tax_amount' => 'numeric|min:0',
            'discount_type' => 'in:fixed,percentage',
            'discount_value' => 'numeric|min:0',
            'quantity_alert' => 'integer|min:0',
            'images.*' => 'image|mimes:jpeg,png,jpg,gif|max:2048',
            'image_urls' => 'nullable|array',
            'image_urls.*' => 'required|string|max:2048',
            'bundle_items' => 'required_if:product_type,bundle|array',
            'bundle_items.*.id' => 'required_if:product_type,bundle|exists:products,id',
            'bundle_items.*.quantity' => 'required_if:product_type,bundle|integer|min:1',
        ]);

        if (isset($validated['name']) && empty($validated['slug'])) {
             $validated['slug'] = Str::slug($validated['name']) . '-' . Str::random(5);
        }

        $product->update($validated);

        if (($validated['product_type'] ?? $product->product_type) === 'bundle' && $request->has('bundle_items')) {
            $syncData = [];
            foreach ($request->bundle_items as $item) {
                $syncData[$item['id']] = ['quantity' => $item['quantity']];
            }
            $product->bundleItems()->sync($syncData);
        } elseif (($validated['product_type'] ?? $product->product_type) !== 'bundle') {
            $product->bundleItems()->detach();
        }

        if ($request->hasFile('images')) {
            // Check if product already has images
            $hasImages = $product->images()->exists();

            foreach ($request->file('images') as $image) {
                $path = $image->store('products', 'public');
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => Storage::url($path),
                    'is_cover' => !$hasImages,
                ]);
                $hasImages = true;
            }
        }

        if ($request->filled('image_urls') && is_array($request->image_urls)) {
            $hasImages = $product->images()->exists();
            foreach ($request->image_urls as $url) {
                if (!is_string($url) || trim($url) === '') {
                    continue;
                }
                ProductImage::create([
                    'product_id' => $product->id,
                    'image_path' => trim($url),
                    'is_cover' => !$hasImages,
                ]);
                $hasImages = true;
            }
        }

        return response()->json($product->load(['category', 'brand', 'unit', 'warehouse', 'images']));
    }

    public function destroy(Product $product)
    {
        // Optional: Delete images from storage
        // foreach ($product->images as $image) {
        //     Storage::disk('public')->delete(str_replace('/storage/', '', $image->image_path));
        // }
        
        $product->delete();

        return response()->noContent();
    }

    public function destroyImage(Product $product, ProductImage $image)
    {
        // Ensure image belongs to product
        if ($image->product_id !== $product->id) {
            return response()->json(['message' => 'Image does not belong to this product'], 403);
        }

        if (!$this->isExternalUrl($image->image_path)) {
            $path = $image->image_path;
            if (is_string($path) && str_starts_with($path, '/storage/')) {
                $path = ltrim(str_replace('/storage/', '', $path), '/');
            }
            $path = is_string($path) ? ltrim($path, '/') : null;
            if (is_string($path) && $path !== '' && !str_starts_with($path, 'http')) {
                Storage::disk('public')->delete($path);
            }
        }

        $image->delete();

        return response()->noContent();
    }

    public function setCoverImage(Product $product, ProductImage $image)
    {
        // Ensure image belongs to product
        if ($image->product_id !== $product->id) {
            return response()->json(['message' => 'Image does not belong to this product'], 403);
        }

        // Set all images of this product to is_cover = false
        $product->images()->update(['is_cover' => false]);

        // Set the specific image to is_cover = true
        $image->update(['is_cover' => true]);

        return response()->json($image);
    }
}
