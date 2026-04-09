<?php

namespace App\Http\Controllers;

use App\Models\Customer;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CustomerController extends Controller
{
    private function normalizePhone(?string $value): ?string
    {
        if (!is_string($value)) {
            return null;
        }
        $trimmed = trim($value);
        if ($trimmed === '') {
            return null;
        }
        $digits = preg_replace('/\D+/', '', $trimmed);
        return is_string($digits) && $digits !== '' ? $digits : null;
    }

    private function inferIsCompany(?string $companyName, ?string $firstName, ?string $lastName): bool
    {
        if (!is_string($companyName) || trim($companyName) === '') {
            return false;
        }

        $first = is_string($firstName) ? trim($firstName) : '';
        $last = is_string($lastName) ? trim($lastName) : '';

        if ($first === '' && $last === '') {
            return true;
        }

        if ($first === 'บริษัท' && $last === '') {
            return true;
        }

        return false;
    }

    private function assertUniquePersonalPhone(?string $phone, ?int $ignoreCustomerId = null): void
    {
        if (!is_string($phone) || $phone === '') {
            return;
        }

        $suffix = substr($phone, -6);
        $candidatesQuery = Customer::query()
            ->select(['id', 'phone', 'company_name', 'first_name', 'last_name'])
            ->whereNotNull('phone');

        if (is_string($suffix) && $suffix !== '') {
            $candidatesQuery->where('phone', 'like', '%' . $suffix);
        }

        if (is_int($ignoreCustomerId)) {
            $candidatesQuery->where('id', '!=', $ignoreCustomerId);
        }

        $candidates = $candidatesQuery->get();
        foreach ($candidates as $candidate) {
            $isCompany = (bool) ($candidate->is_company ?? $this->inferIsCompany($candidate->company_name, $candidate->first_name, $candidate->last_name));
            if ($isCompany) {
                continue;
            }

            $candidatePhone = $this->normalizePhone($candidate->phone);
            if ($candidatePhone === $phone) {
                throw ValidationException::withMessages([
                    'phone' => ['เบอร์โทรนี้ถูกใช้งานแล้ว'],
                ]);
            }
        }
    }

    public function index(Request $request)
    {
        $query = Customer::query()->orderByDesc('id');

        $type = trim((string) $request->input('type', ''));
        if ($type === 'company') {
            $query->where('is_company', true);
        } elseif ($type === 'personal') {
            $query->where('is_company', false);
        }

        if ($request->has('search')) {
            $search = trim((string) $request->input('search', ''));
            if ($search !== '') {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('company_name', 'like', "%{$search}%")
                        ->orWhere('email', 'like', "%{$search}%")
                        ->orWhere('phone', 'like', "%{$search}%")
                        ->orWhere('tax_id', 'like', "%{$search}%");
                });
            }
        }

        if ($request->boolean('has_available_order_for_appointment')) {
            $query->whereExists(function ($sub) {
                $sub->select(DB::raw(1))
                    ->from('orders')
                    ->whereColumn('orders.customer_id', 'customers.id')
                    ->whereIn('orders.status', ['pending', 'completed'])
                    ->whereNotExists(function ($sub2) {
                        $sub2->select(DB::raw(1))
                            ->from('appointments')
                            ->whereColumn('appointments.order_id', 'orders.id');
                    });
            });
        }

        return $query->paginate($request->input('per_page', 10));
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'nullable|string|max:255',
            'first_name' => 'nullable|string|max:255',
            'last_name' => 'nullable|string|max:255',
            'company_name' => 'nullable|string|max:255',
            'is_company' => 'nullable|boolean',
            'contact_name' => 'nullable|string|max:255',
            'phone' => 'nullable|string|max:20',
            'email' => 'nullable|string|email|max:255',
            'address' => 'nullable|string',
            'tax_id' => 'nullable|string|max:50',
            'line_id' => 'nullable|string|max:255',
        ]);

        $company = isset($validated['company_name']) ? trim((string) $validated['company_name']) : '';
        $first = isset($validated['first_name']) ? trim((string) $validated['first_name']) : '';
        $last = isset($validated['last_name']) ? trim((string) $validated['last_name']) : '';
        $display = isset($validated['name']) ? trim((string) $validated['name']) : '';

        if ($company !== '') {
            $validated['company_name'] = $company;
        } else {
            $validated['company_name'] = null;
        }

        if ($display === '') {
            $display = $validated['company_name'] ?: trim($first . ' ' . $last);
        }

        if ($display === '') {
            $display = 'Walk-in Customer';
        }

        $validated['name'] = $display;
        $validated['first_name'] = $first !== '' ? $first : null;
        $validated['last_name'] = $last !== '' ? $last : null;

        if (array_key_exists('phone', $validated)) {
            $validated['phone'] = $this->normalizePhone(is_string($validated['phone']) ? $validated['phone'] : null);
        }
        if (isset($validated['email']) && trim((string) $validated['email']) === '') $validated['email'] = null;
        if (isset($validated['tax_id']) && trim((string) $validated['tax_id']) === '') $validated['tax_id'] = null;
        if (isset($validated['line_id']) && trim((string) $validated['line_id']) === '') $validated['line_id'] = null;
        if (isset($validated['address']) && trim((string) $validated['address']) === '') $validated['address'] = null;
        if (isset($validated['contact_name']) && trim((string) $validated['contact_name']) === '') $validated['contact_name'] = null;

        $isCompany = array_key_exists('is_company', $validated)
            ? (bool) $validated['is_company']
            : $this->inferIsCompany($validated['company_name'], $validated['first_name'], $validated['last_name']);
        $validated['is_company'] = $isCompany;

        if (!$isCompany) {
            $this->assertUniquePersonalPhone($validated['phone'] ?? null);
        }

        $customer = Customer::create($validated);

        return response()->json($customer, 201);
    }

    public function show(Customer $customer)
    {
        return $customer;
    }

    public function update(Request $request, Customer $customer)
    {
        $validated = $request->validate([
            'name' => 'sometimes|nullable|string|max:255',
            'first_name' => 'sometimes|nullable|string|max:255',
            'last_name' => 'sometimes|nullable|string|max:255',
            'company_name' => 'sometimes|nullable|string|max:255',
            'is_company' => 'sometimes|nullable|boolean',
            'contact_name' => 'sometimes|nullable|string|max:255',
            'phone' => 'sometimes|nullable|string|max:20',
            'email' => 'sometimes|nullable|string|email|max:255',
            'address' => 'sometimes|nullable|string',
            'tax_id' => 'sometimes|nullable|string|max:50',
            'line_id' => 'sometimes|nullable|string|max:255',
        ]);

        if (array_key_exists('company_name', $validated)) {
            $company = is_string($validated['company_name']) ? trim($validated['company_name']) : '';
            $validated['company_name'] = $company !== '' ? $company : null;
        }

        if (array_key_exists('first_name', $validated)) {
            $first = is_string($validated['first_name']) ? trim($validated['first_name']) : '';
            $validated['first_name'] = $first !== '' ? $first : null;
        }
        if (array_key_exists('last_name', $validated)) {
            $last = is_string($validated['last_name']) ? trim($validated['last_name']) : '';
            $validated['last_name'] = $last !== '' ? $last : null;
        }

        if (array_key_exists('phone', $validated)) {
            $validated['phone'] = $this->normalizePhone(is_string($validated['phone']) ? $validated['phone'] : null);
        }
        if (array_key_exists('email', $validated)) {
            $email = is_string($validated['email']) ? trim($validated['email']) : '';
            $validated['email'] = $email !== '' ? $email : null;
        }
        if (array_key_exists('tax_id', $validated)) {
            $tax = is_string($validated['tax_id']) ? trim($validated['tax_id']) : '';
            $validated['tax_id'] = $tax !== '' ? $tax : null;
        }
        if (array_key_exists('line_id', $validated)) {
            $line = is_string($validated['line_id']) ? trim($validated['line_id']) : '';
            $validated['line_id'] = $line !== '' ? $line : null;
        }
        if (array_key_exists('address', $validated)) {
            $addr = is_string($validated['address']) ? trim($validated['address']) : '';
            $validated['address'] = $addr !== '' ? $addr : null;
        }
        if (array_key_exists('contact_name', $validated)) {
            $cn = is_string($validated['contact_name']) ? trim($validated['contact_name']) : '';
            $validated['contact_name'] = $cn !== '' ? $cn : null;
        }

        $companyName = array_key_exists('company_name', $validated) ? $validated['company_name'] : $customer->company_name;
        $firstName = array_key_exists('first_name', $validated) ? $validated['first_name'] : $customer->first_name;
        $lastName = array_key_exists('last_name', $validated) ? $validated['last_name'] : $customer->last_name;
        $explicitName = array_key_exists('name', $validated) ? (is_string($validated['name']) ? trim($validated['name']) : '') : null;
        $nextPhone = array_key_exists('phone', $validated) ? $validated['phone'] : $customer->phone;
        $nextIsCompany = array_key_exists('is_company', $validated)
            ? (bool) $validated['is_company']
            : (bool) ($customer->is_company ?? $this->inferIsCompany($companyName, $firstName, $lastName));

        if ($explicitName !== null) {
            $validated['name'] = $explicitName !== '' ? $explicitName : null;
        }

        if (!array_key_exists('name', $validated) || $validated['name'] === null) {
            $next = $companyName ?: trim(($firstName ?? '') . ' ' . ($lastName ?? ''));
            $validated['name'] = $next !== '' ? $next : ($customer->name ?: 'Walk-in Customer');
        }

        $phoneChanged = array_key_exists('phone', $validated) && $validated['phone'] !== $customer->phone;
        if (!$nextIsCompany && $phoneChanged) {
            $this->assertUniquePersonalPhone($nextPhone, $customer->id);
        }

        $validated['is_company'] = $nextIsCompany;
        $customer->update($validated);

        return response()->json($customer);
    }

    public function destroy(Customer $customer)
    {
        $customer->delete();
        return response()->noContent();
    }
}
