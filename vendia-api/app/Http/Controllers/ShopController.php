<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Shop;
use Illuminate\Support\Facades\Storage;

class ShopController extends Controller
{
    private function isExternalUrl(?string $value): bool
    {
        if (!is_string($value) || $value === '') {
            return false;
        }
        return str_starts_with($value, 'http://') || str_starts_with($value, 'https://');
    }

    private function deletePublicIfLocal(?string $value): void
    {
        if (!is_string($value) || $value === '' || $this->isExternalUrl($value)) {
            return;
        }

        $path = $value;
        if (str_starts_with($path, '/storage/')) {
            $path = ltrim(str_replace('/storage/', '', $path), '/');
        }
        $path = ltrim($path, '/');

        if ($path !== '') {
            Storage::disk('public')->delete($path);
        }
    }

    public function index()
    {
        $defaultLogoPath = file_exists(public_path('storage/shops/logo.png')) ? 'shops/logo.png' : null;
        $defaultSignaturePath = file_exists(public_path('storage/shops/sign.png')) ? 'shops/sign.png' : null;

        $shop = Shop::first();
        if (! $shop) {
            $shop = Shop::create([
                'name' => 'Vendia',
                'logo_path' => $defaultLogoPath,
                'signature_path' => $defaultSignaturePath,
            ]);

            return response()->json($shop);
        }

        $changed = false;
        if ((!is_string($shop->logo_path) || trim($shop->logo_path) === '') && $defaultLogoPath) {
            $shop->logo_path = $defaultLogoPath;
            $changed = true;
        }
        if ((!is_string($shop->signature_path) || trim($shop->signature_path) === '') && $defaultSignaturePath) {
            $shop->signature_path = $defaultSignaturePath;
            $changed = true;
        }
        if ($changed) {
            $shop->save();
        }

        return response()->json($shop);
    }

    public function update(Request $request)
    {
        $shop = Shop::first() ?? new Shop();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'authorized_signatory_name' => 'nullable|string|max:255',
            'bank_details' => 'nullable|string',
            'address' => 'nullable|string',
            'phone' => 'nullable|string',
            'tax_id' => 'nullable|string',
            'email' => 'nullable|email',
            'website' => 'nullable|url',
            'footer_text' => 'nullable|string',
            'remarks' => 'nullable|string',
            'attendance_office_ips' => 'nullable|string|max:10000',
            'bank_details' => 'nullable|string',
            'logo' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'signature' => 'nullable|image|mimes:jpeg,png,jpg,gif|max:2048',
            'logo_path' => 'nullable|string|max:2048',
            'signature_path' => 'nullable|string|max:2048',
        ]);

        $shop->name = $validated['name'];
        $shop->company_name = $validated['company_name'] ?? $shop->company_name;
        $shop->authorized_signatory_name = $validated['authorized_signatory_name'] ?? $shop->authorized_signatory_name;
        $shop->bank_details = $validated['bank_details'] ?? $shop->bank_details;
        $shop->address = $validated['address'] ?? $shop->address;
        $shop->phone = $validated['phone'] ?? $shop->phone;
        $shop->tax_id = $validated['tax_id'] ?? $shop->tax_id;
        $shop->email = $validated['email'] ?? $shop->email;
        $shop->website = $validated['website'] ?? $shop->website;
        $shop->footer_text = $validated['footer_text'] ?? $shop->footer_text;
        $shop->remarks = $validated['remarks'] ?? $shop->remarks;
        $shop->bank_details = $validated['bank_details'] ?? $shop->bank_details;
        $shop->attendance_office_ips = $validated['attendance_office_ips'] ?? $shop->attendance_office_ips;

        if ($request->hasFile('logo')) {
            $this->deletePublicIfLocal($shop->logo_path);
            $path = $request->file('logo')->store('shops', 'public');
            $shop->logo_path = $path;
        } elseif (array_key_exists('logo_path', $validated) && is_string($validated['logo_path']) && $validated['logo_path'] !== '') {
            $this->deletePublicIfLocal($shop->logo_path);
            $shop->logo_path = $validated['logo_path'];
        }

        if ($request->hasFile('signature')) {
            $this->deletePublicIfLocal($shop->signature_path);
            $path = $request->file('signature')->store('shops', 'public');
            $shop->signature_path = $path;
        } elseif (array_key_exists('signature_path', $validated) && is_string($validated['signature_path']) && $validated['signature_path'] !== '') {
            $this->deletePublicIfLocal($shop->signature_path);
            $shop->signature_path = $validated['signature_path'];
        }

        $shop->save();

        return response()->json([
            'message' => 'Shop settings updated successfully',
            'shop' => $shop
        ]);
    }
}
