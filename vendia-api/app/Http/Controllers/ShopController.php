<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shop;
use Illuminate\Support\Facades\Storage;

class ShopController extends Controller
{
    public function index()
    {
        return response()->json(Shop::firstOrFail());
    }

    public function update(Request $request)
    {
        $shop = Shop::firstOrFail();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'email' => 'nullable|email',
            'website' => 'nullable|url',
            'footer_text' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
        ]);

        $shop->name = $validated['name'];
        $shop->address = $validated['address'] ?? $shop->address;
        $shop->phone = $validated['phone'] ?? $shop->phone;
        $shop->tax_id = $validated['tax_id'] ?? $shop->tax_id;
        $shop->email = $validated['email'] ?? $shop->email;
        $shop->website = $validated['website'] ?? $shop->website;
        $shop->footer_text = $validated['footer_text'] ?? $shop->footer_text;

        if ($request->hasFile('logo')) {
            // Delete old logo if exists
            if ($shop->logo_path) {
                Storage::disk('public')->delete($shop->logo_path);
            }
            $path = $request->file('logo')->store('shops', 'public');
            $shop->logo_path = $path;
        }

        $shop->save();

        return response()->json([
            'message' => 'Shop settings updated successfully',
            'shop' => $shop
        ]);
    }
}
