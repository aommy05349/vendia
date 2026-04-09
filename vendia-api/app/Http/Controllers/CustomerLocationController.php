<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Config;

class CustomerLocationController extends Controller
{
    public function index($userId)
    {
        return response()->json(
            \App\Models\CustomerLocation::where('customer_id', $userId)
                ->orderBy('is_default', 'desc')
                ->get()
        );
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'name' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
            'contact_person' => 'nullable|string',
            'contact_phone' => 'nullable|string',
            'is_default' => 'boolean',
        ]);

        $validated['address'] = preg_replace('/\s+/', ' ', trim($validated['address']));
        $validated['name'] = isset($validated['name']) && trim($validated['name']) !== ''
            ? preg_replace('/\s+/', ' ', trim($validated['name']))
            : null;

        $existing = \App\Models\CustomerLocation::query()
            ->where('customer_id', $validated['customer_id'])
            ->where('address', $validated['address'])
            ->when($validated['name'] === null, function ($q) {
                return $q->whereNull('name');
            }, function ($q) use ($validated) {
                return $q->where('name', $validated['name']);
            })
            ->first();

        if ($existing) {
            if ($request->boolean('is_default')) {
                \App\Models\CustomerLocation::where('customer_id', $validated['customer_id'])->update(['is_default' => false]);
                $existing->update(['is_default' => true]);
            }
            return response()->json($existing, 200);
        }

        if ($request->is_default) {
            \App\Models\CustomerLocation::where('customer_id', $request->customer_id)->update(['is_default' => false]);
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
            \App\Models\CustomerLocation::where('customer_id', $location->customer_id)->update(['is_default' => false]);
        }

        $location->update($validated);

        return response()->json($location);
    }

    public function destroy($id)
    {
        \App\Models\CustomerLocation::destroy($id);
        return response()->noContent();
    }

    public function geocode(Request $request)
    {
        $validated = $request->validate([
            'query' => 'required|string|max:500',
        ]);

        $userAgent = Config::get('app.name', 'vendia-app') . ' (contact: ' . (Config::get('mail.from.address', 'noreply@example.com')) . ')';

        /** @var \Illuminate\Http\Client\Response $response */
        $response = Http::withHeaders([
            'User-Agent' => $userAgent,
        ])->get('https://nominatim.openstreetmap.org/search', [
            'q' => $validated['query'],
            'format' => 'json',
            'addressdetails' => 1,
            'limit' => 5,
            'countrycodes' => 'th',
        ]);

        if ($response->status() !== 200) {
            return response()->json([
                'message' => 'Geocoding service unavailable',
            ], 502);
        }

        $data = json_decode($response->body(), true) ?? [];

        $results = collect($data)->map(function ($item) {
            return [
                'display_name' => $item['display_name'] ?? '',
                'lat' => isset($item['lat']) ? (float) $item['lat'] : null,
                'lon' => isset($item['lon']) ? (float) $item['lon'] : null,
            ];
        })->filter(function ($item) {
            return $item['lat'] !== null && $item['lon'] !== null;
        })->values();

        return response()->json($results);
    }
}
