<?php

namespace App\Http\Controllers;

use App\Models\Product;
use App\Models\Unit;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;

class UnitController extends Controller
{
    public function index()
    {
        return Unit::all();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'required|string|max:50',
        ]);

        $unit = Unit::create($validated);
        return response()->json($unit, 201);
    }

    public function show(Unit $unit)
    {
        return $unit;
    }

    public function update(Request $request, Unit $unit)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'short_name' => 'required|string|max:50',
        ]);

        $unit->update($validated);
        return response()->json($unit);
    }

    public function destroy(Unit $unit)
    {
        $isUsed = Product::where('unit_id', $unit->id)->exists();
        if ($isUsed) {
            return response()->json([
                'message' => 'ไม่สามารถลบหน่วยนับนี้ได้ เพราะมีสินค้าใช้งานอยู่',
            ], 422);
        }

        try {
            $unit->delete();
        } catch (QueryException $e) {
            return response()->json([
                'message' => 'ไม่สามารถลบหน่วยนับนี้ได้ เพราะมีข้อมูลที่อ้างอิงอยู่',
            ], 422);
        }

        return response()->noContent();
    }
}
