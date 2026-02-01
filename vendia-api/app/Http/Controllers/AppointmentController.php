<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;

class AppointmentController extends Controller
{
    public function index(Request $request)
    {
        $query = \App\Models\Appointment::with(['customer', 'technicians', 'order'])
            ->orderBy('start_time', 'asc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('technician_id')) {
            $query->whereHas('assignees', function ($q) use ($request) {
                $q->where('user_id', $request->technician_id);
            });
        }
        
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('start_time', [$request->start_date, $request->end_date]);
        }

        return response()->json($query->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'customer_id' => 'required|exists:users,id',
            'order_id' => 'nullable|exists:orders,id',
            'title' => 'required|string',
            'description' => 'nullable|string',
            'start_time' => 'required|date',
            'end_time' => 'nullable|date|after:start_time',
            // Location Snapshot
            'location_name' => 'nullable|string',
            'address' => 'required|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
            'contact_name' => 'nullable|string',
            'contact_phone' => 'nullable|string',
            'admin_notes' => 'nullable|string',
            // Assignees
            'technicians' => 'nullable|array',
            'technicians.*.id' => 'required_with:technicians|exists:users,id',
            'technicians.*.is_lead' => 'boolean',
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

        return response()->json($appointment->load(['customer', 'technicians']), 201);
    }

    public function show($id)
    {
        return response()->json(
            \App\Models\Appointment::with(['customer', 'technicians', 'order', 'order.items', 'order.items.product', 'order.items.product.images'])->findOrFail($id)
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
            'end_time' => 'nullable|date|after:start_time',
            'admin_notes' => 'nullable|string',
            'technician_notes' => 'nullable|string',
            // Location updates allowed if needed
            'address' => 'sometimes|string',
            'latitude' => 'nullable|numeric',
            'longitude' => 'nullable|numeric',
            'google_maps_link' => 'nullable|string',
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

        return response()->json($appointment->load(['customer', 'technicians']));
    }

    public function destroy($id)
    {
        \App\Models\Appointment::destroy($id);
        return response()->noContent();
    }
}
