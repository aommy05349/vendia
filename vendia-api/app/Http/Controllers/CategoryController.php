<?php

namespace App\Http\Controllers;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class CategoryController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $query = Category::query();

        if ($request->has('has_products') && $request->boolean('has_products')) {
            $query->where(function ($q) {
                $q->whereHas('products')
                    ->orWhereHas('children.products');
            });
        }

        return $query->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')
            ->orderBy('name')
            ->get();
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        $category = Category::create($validated);

        return response()->json($category, 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        return Category::findOrFail($id);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        $category = Category::findOrFail($id);

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'parent_id' => 'nullable|exists:categories,id',
        ]);

        if (array_key_exists('parent_id', $validated) && (int) $validated['parent_id'] === (int) $category->id) {
            return response()->json([
                'message' => 'parent_id ไม่สามารถเป็นตัวเองได้',
            ], 422);
        }

        if (array_key_exists('parent_id', $validated) && $validated['parent_id']) {
            $hasChildren = Category::where('parent_id', $category->id)->exists();
            if ($hasChildren) {
                return response()->json([
                    'message' => 'ไม่สามารถกำหนดหมวดนี้ให้เป็นหมวดย่อยได้ เพราะมีหมวดย่อยอยู่',
                ], 422);
            }
        }

        $category->update($validated);

        return response()->json($category);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        $category = Category::findOrFail($id);
        $hasChildren = Category::where('parent_id', $category->id)->exists();
        if ($hasChildren) {
            return response()->json([
                'message' => 'ไม่สามารถลบหมวดหมู่นี้ได้ เพราะมีหมวดย่อยอยู่',
            ], 422);
        }
        $isUsed = Product::where('category_id', $category->id)->exists();
        if ($isUsed) {
            return response()->json([
                'message' => 'ไม่สามารถลบหมวดหมู่นี้ได้ เพราะมีสินค้าใช้งานอยู่',
            ], 422);
        }

        try {
            $category->delete();
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'ไม่สามารถลบหมวดหมู่นี้ได้ เพราะมีข้อมูลที่อ้างอิงอยู่',
            ], 422);
        }

        return response()->noContent();
    }
}
