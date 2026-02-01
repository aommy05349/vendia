<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class CustomerLocationController extends Controller
{
    public function index($userId)
    {
        return response()->json(
            \App\Models\CustomerLocation::where('user_id', $userId)
                ->orderBy('is_default', 'desc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'name' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'contact_phone' => 'nullable|string',
            'is_default' => 'boolean',
        ]);

        if ($request->is_default) {
            \App\Models\CustomerLocation::where('user_id', $request->user_id)->update(['is_default' => false]);
        }

        $location = \App\Models\CustomerLocation::create($validated);

        return response()->json($location, 201);
    }

    public function update(Request $request, $id)
    {
        $location = \App\Models\CustomerLocation::findOrFail($id);

        $validated = $request->validate([
            'name' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'contact_phone' => 'nullable|string',
            'is_default' => 'boolean',
        ]);

        if ($request->is_default) {
            \App\Models\CustomerLocation::where('user_id', $location->user_id)->update(['is_default' => false]);
        }

        $location->update($validated);

        return response()->json($location);
    }

    public function destroy($id)
    {
        \App\Models\CustomerLocation::destroy($id);
        return response()->noContent();
    }
}
