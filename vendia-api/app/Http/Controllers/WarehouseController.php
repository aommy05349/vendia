<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Warehouse;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class WarehouseController extends Controller
{
    public function index()
    {
        return Warehouse::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        $warehouse = Warehouse::create($validated);
        return response()->json($warehouse, 201);
    }

    public function show(Warehouse $warehouse)
    {
        return $warehouse;
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'email' => 'nullable|email',
        ]);

        $warehouse->update($validated);
        return response()->json($warehouse);
    }

    public function destroy(Warehouse $warehouse)
    {
        $isUsed = Product::where('warehouse_id', $warehouse->id)->exists();
        if ($isUsed) {
            return response()->json([
                'message' => 'ไม่สามารถลบคลังสินค้านี้ได้ เพราะมีสินค้าใช้งานอยู่',
            ], 422);
        }

        try {
            $warehouse->delete();
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'ไม่สามารถลบคลังสินค้านี้ได้ เพราะมีข้อมูลที่อ้างอิงอยู่',
            ], 422);
        }

        return response()->noContent();
    }
}
