<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $query = \App\Models\Appointment::with(['customer', 'technicians', 'order', 'team']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('technician_id')) {
            $query->whereHas('assignees', function ($q) use ($request) {
                $q->where('user_id', $request->technician_id);
            });
        }
        
        if ($request->has('start_date') && $request->has('end_date')) {
            // Include full day range
            $start = \Carbon\Carbon::parse($request->start_date)->startOfDay();
            $end = \Carbon\Carbon::parse($request->end_date)->endOfDay();
            $query->whereBetween('start_time', [$start, $end]);
        }

        if ($request->has('per_page')) {
            $now = \Carbon\Carbon::now()->toDateTimeString();
            $query
                ->orderByRaw("CASE WHEN start_time >= ? THEN 0 ELSE 1 END ASC", [$now])
                ->orderByRaw("CASE WHEN start_time >= ? THEN start_time END ASC", [$now])
                ->orderByRaw("CASE WHEN start_time < ? THEN start_time END DESC", [$now])
                ->orderByDesc('id');
            return response()->json($query->paginate($request->per_page));
        }

        $query->orderBy('start_time', 'asc')->orderBy('id', 'asc');

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:customers,id',
            'order_id' => [
                'required',
                'exists:orders,id',
                function ($attribute, $value, $fail) use ($request) {
                    if ($value) {
                        $order = \App\Models\Order::find($value);
                        if ($order && $order->customer_id != $request->customer_id) {
                            $fail('The selected order does not belong to the customer.');
                        }
                    }
                },
            ],
            'title' => 'required|string',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            // Location Snapshot
            'location_name' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
            'contact_name' => 'nullable|string',
            'contact_phone' => 'nullable|string',
            'admin_notes' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            // Assignees
            'technicians' => 'nullable|array',
            'technicians.*.id' => 'required_with:technicians|exists:users,id',
            'technicians.*.is_lead' => 'boolean',
        ], [
            'end_time.after_or_equal' => 'เวลาสิ้นสุดต้องมากกว่าหรือเท่ากับเวลาเริ่มต้น',
        ]);

        $appointment = \App\Models\Appointment::create(collect($validated)->except('technicians')->toArray());

        if (!empty($request->technicians)) {
            foreach ($request->technicians as $tech) {
                \App\Models\AppointmentAssignee::create([
                    'appointment_id' => $appointment->id,
                    'user_id' => $tech['id'],
                    'is_lead' => $tech['is_lead'] ?? false,
                ]);
            }
        }

        return response()->json($appointment->load(['customer', 'technicians', 'team']), 201);
    }

    public function show($id)
    {
        return response()->json(
            \App\Models\Appointment::with([
                'customer',
                'team',
                'technicians',
                'order',
                'order.items',
                'order.items.product',
                'order.items.product.images',
                'order.children',
                'order.children.items',
                'order.children.items.product',
                'order.children.items.product.images',
            ])->findOrFail($id)
        );
    }

    public function update(Request $request, $id)
    {
        $appointment = \App\Models\Appointment::findOrFail($id);

        $validated = $request->validate([
            'title' => 'sometimes|string',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:scheduled,en_route,in_progress,completed,cancelled',
            'start_time' => 'sometimes|date',
            'end_time' => 'nullable|date|after_or_equal:start_time',
            'admin_notes' => 'nullable|string',
            'technician_notes' => 'nullable|string',
            // Location updates allowed if needed
            'location_name' => 'sometimes|nullable|string',
            'address' => 'sometimes|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
            'contact_name' => 'nullable|string',
            'contact_phone' => 'nullable|string',
            'team_id' => 'nullable|exists:teams,id',
            // Order relink
            'order_id' => [
                'sometimes',
                'required',
                'exists:orders,id',
                function ($attribute, $value, $fail) use ($appointment) {
                    if ($value) {
                        $order = \App\Models\Order::find($value);
                        if ($order && $order->customer_id != $appointment->customer_id) {
                            $fail('The selected order does not belong to the customer.');
                        }
                    }
                },
            ],
        ], [
            'end_time.after_or_equal' => 'เวลาสิ้นสุดต้องมากกว่าหรือเท่ากับเวลาเริ่มต้น',
        ]);

        $appointment->update($validated);

        // Update technicians if provided
        if ($request->has('technicians')) {
            $appointment->assignees()->delete();
            foreach ($request->technicians as $tech) {
                \App\Models\AppointmentAssignee::create([
                    'appointment_id' => $appointment->id,
                    'user_id' => $tech['id'],
                    'is_lead' => $tech['is_lead'] ?? false,
                ]);
            }
        }

        return response()->json($appointment->load(['customer', 'technicians', 'team', 'order', 'order.items', 'order.items.product', 'order.items.product.images']));
    }

    public function destroy($id)
    {
        \App\Models\Appointment::destroy($id);
        return response()->noContent();
    }
}
