<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\OrderController;
use App\Http\Controllers\ProductController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\ShopController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\BrandController;
use App\Http\Controllers\UnitController;
use App\Http\Controllers\WarehouseController;
use App\Http\Controllers\AttendanceController;
use App\Http\Controllers\CustomerLocationController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DocumentController;
use Illuminate\Http\Request;
use App\Http\Controllers\TeamController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::get('/shop', [ShopController::class, 'index']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/shop', [ShopController::class, 'update']);

    Route::apiResource('users', UserController::class);
    Route::apiResource('customers', CustomerController::class);
    Route::delete('/products/{product}/images/{image}', [ProductController::class, 'destroyImage']);
    Route::post('/products/{product}/images/{image}/set-cover', [ProductController::class, 'setCoverImage']);
    Route::apiResource('products', ProductController::class);
    Route::apiResource('categories', CategoryController::class);
    Route::apiResource('brands', BrandController::class);
    Route::apiResource('units', UnitController::class);
    Route::apiResource('warehouses', WarehouseController::class);
    Route::get('/orders/daily-sales', [OrderController::class, 'dailySales']);
    Route::post('/orders/{id}/cancel-document', [OrderController::class, 'cancelDocument']);
    Route::post('/orders/{id}/issue-document', [OrderController::class, 'issueDocument']);
    Route::post('/orders/{order}/purge', [OrderController::class, 'purge']);
    Route::apiResource('orders', OrderController::class);

    // Documents
    Route::get('/documents', [DocumentController::class, 'index']);
    Route::get('/documents/{document}', [DocumentController::class, 'show']);
    Route::put('/documents/{document}', [DocumentController::class, 'update']);
    Route::delete('/documents/{document}', [DocumentController::class, 'destroy']);

    // Attendance
    Route::post('/attendance/check-in', [AttendanceController::class, 'checkIn']);
    Route::post('/attendance/check-out', [AttendanceController::class, 'checkOut']);
    Route::get('/attendance/status', [AttendanceController::class, 'currentStatus']);
    Route::get('/attendance/overview', [AttendanceController::class, 'overview']);
    Route::get('/attendance/summary', [AttendanceController::class, 'summary']);
    Route::get('/attendance/history/{user}', [AttendanceController::class, 'history']);
    Route::post('/attendance/leave-request', [AttendanceController::class, 'requestLeave']);
    Route::post('/attendance/absent', [AttendanceController::class, 'markAbsent']);
    Route::put('/attendance/{id}', [AttendanceController::class, 'update']);
    Route::get('/attendance', [AttendanceController::class, 'index']);

    // Customer Locations
    Route::get('/customers/{customer}/locations', [CustomerLocationController::class, 'index']);
    Route::post('/customer-locations', [CustomerLocationController::class, 'store']);
    Route::put('/customer-locations/{id}', [CustomerLocationController::class, 'update']);
    Route::delete('/customer-locations/{id}', [CustomerLocationController::class, 'destroy']);
    Route::get('/customer-locations/geocode', [CustomerLocationController::class, 'geocode'])->middleware('throttle:10,1');

    // Appointments
    Route::apiResource('appointments', \App\Http\Controllers\AppointmentController::class);

    // Teams
    Route::get('/teams/technicians', [TeamController::class, 'technicians']);
    Route::get('/teams/daily-assignments', [TeamController::class, 'dailyAssignments']);
    Route::apiResource('teams', TeamController::class);
});
