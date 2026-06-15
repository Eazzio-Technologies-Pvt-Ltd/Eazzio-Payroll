import 'dart:async';
import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../core/theme/app_theme.dart';
import '../widgets/skeleton_loader.dart';

class MapScreen extends StatefulWidget {
  const MapScreen({super.key});

  @override
  State<MapScreen> createState() => _MapScreenState();
}

class _MapScreenState extends State<MapScreen> {
  final MapController _mapController = MapController();
  LatLng _currentCenter = const LatLng(22.80456, 86.20287); // Default to Jamshedpur center
  bool _isLoading = true;
  String? _mapToken;
  List<Polygon> _geofencePolygons = [];
  List<Marker> _markers = [];
  // Tracked state variables
  List<Map<String, dynamic>> _zonesList = [];
  bool _isInsideZone = false;
  String _currentZoneName = "None";
  StreamSubscription<Position>? _locationSubscription;
  // Location sharing is system-controlled — starts on Punch In, stops on Punch Out — no manual toggle for employee
  // Always ON — locked by system. No field needed since the indicator is static.
  double _currentSpeed = 0.0;

  @override
  void initState() {
    super.initState();
    // Location sharing is always ON — system-controlled, no user toggle
    _initMapData();
    
    // Subscribe to live location updates
    _locationSubscription = LocationService().onLocationChanged.listen((Position position) {
      if (mounted) {
        setState(() {
          _currentSpeed = position.speed;
        });
        _updateLocationPin(LatLng(position.latitude, position.longitude));
      }
    });
  }

  @override
  void dispose() {
    _locationSubscription?.cancel();
    _mapController.dispose();
    super.dispose();
  }

  Future<void> _initMapData() async {
    await _fetchMapToken();
    await _fetchCurrentLocation();
    await _fetchGeofences();
  }

  Future<void> _fetchMapToken() async {
    try {
      final response = await ApiService.client.get('/map/token');
      if (response.data['success'] == true) {
        if (mounted) {
          setState(() {
            _mapToken = response.data['data']['token'];
          });
        }
      }
    } catch (e) {
      // Fallback to OSM if token fetch fails
    }
  }

  Future<void> _fetchCurrentLocation() async {
    try {
      var permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.whileInUse || permission == LocationPermission.always) {
        Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
        );
        if (mounted) {
          _updateLocationPin(LatLng(position.latitude, position.longitude));
          setState(() {
            _isLoading = false;
          });
          _mapController.move(_currentCenter, 14.0);
        }
      } else {
        if (mounted) {
          setState(() => _isLoading = false);
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  void _updateLocationPin(LatLng pos) {
    setState(() {
      _currentCenter = pos;
      
      // Remove any existing my_location marker
      _markers.removeWhere((m) => m.key == const Key('my_location'));
      
      // Add the blue pulse location pin marker
      _markers.add(
        Marker(
          key: const Key('my_location'),
          point: pos,
          width: 44,
          height: 44,
          child: Stack(
            alignment: Alignment.center,
            children: [
              Container(
                width: 24,
                height: 24,
                decoration: BoxDecoration(
                  color: AppColors.primary.withOpacity(0.2),
                  shape: BoxShape.circle,
                ),
              ),
              Container(
                width: 14,
                height: 14,
                decoration: const BoxDecoration(
                  color: Colors.white,
                  shape: BoxShape.circle,
                ),
              ),
              Container(
                width: 10,
                height: 10,
                decoration: const BoxDecoration(
                  color: AppColors.primary,
                  shape: BoxShape.circle,
                ),
              ),
            ],
          ),
        ),
      );
    });
    
    _checkGeofenceStatus(pos);
  }

  bool _isPointInPolygon(LatLng point, List<LatLng> polygon) {
    bool inside = false;
    for (int i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      final xi = polygon[i].longitude;
      final yi = polygon[i].latitude;
      final xj = polygon[j].longitude;
      final yj = polygon[j].latitude;
      
      final intersect = ((yi > point.latitude) != (yj > point.latitude)) &&
          (point.longitude < (xj - xi) * (point.latitude - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  void _checkGeofenceStatus(LatLng currentPos) {
    bool inside = false;
    String zoneName = "None";
    
    for (var zone in _zonesList) {
      final List<LatLng> points = zone['points'];
      if (_isPointInPolygon(currentPos, points)) {
        inside = true;
        zoneName = zone['name'];
        break;
      }
    }
    
    setState(() {
      _isInsideZone = inside;
      _currentZoneName = zoneName;
    });
  }

  List<LatLng> _generateCirclePolygon(LatLng center, double radiusInMeters, {int points = 36}) {
    List<LatLng> polygon = [];
    final earthRadius = 6371000.0;
    for (int i = 0; i < points; i++) {
      final angle = (i * 360 / points) * (math.pi / 180);
      final dLat = (radiusInMeters / earthRadius) * (180 / math.pi);
      final dLng = dLat / (math.cos(center.latitude * math.pi / 180));
      polygon.add(LatLng(
        center.latitude + dLat * math.sin(angle),
        center.longitude + dLng * math.cos(angle),
      ));
    }
    return polygon;
  }

  Future<void> _fetchGeofences() async {
    try {
      final response = await ApiService.client.get('/geofence/zones');
      if (response.data['success'] == true) {
        final list = response.data['data'] as List? ?? [];
        _zonesList = list.map((zone) {
          List<LatLng> points = [];
          if (zone['polygon'] != null && zone['polygon']['coordinates'] != null) {
            final coords = zone['polygon']['coordinates'][0] as List;
            for (var coord in coords) {
              points.add(LatLng((coord[1] as num).toDouble(), (coord[0] as num).toDouble()));
            }
          }
          return {
            'name': zone['name'] ?? 'Work Boundary',
            'points': points,
          };
        }).toList();

        _drawGeofencePolygons();
      }
    } catch (e) {
      // Offline/fallback geofence mocking for robust execution
      _zonesList = [
        {'name': 'Bistupur Office', 'points': _generateCirclePolygon(const LatLng(22.786999, 86.184998), 350.0)},
        {'name': 'Sakchi Market', 'points': _generateCirclePolygon(const LatLng(22.805618, 86.202875), 400.0)},
        {'name': 'Baridih Jamshedpur', 'points': _generateCirclePolygon(const LatLng(22.796477, 86.251413), 500.0)},
      ];
      _drawGeofencePolygons();
    }
  }

  void _drawGeofencePolygons() {
    final polygons = _zonesList.where((zone) => (zone['points'] as List).isNotEmpty).map((zone) {
      final points = zone['points'] as List<LatLng>;
      return Polygon(
        points: points,
        color: AppColors.primaryContainer.withOpacity(0.15),
        borderColor: AppColors.primary,
        borderStrokeWidth: 1.5,
      );
    }).toList();

    // Also add zone center pins using polygon centroid
    final zoneMarkers = _zonesList.where((zone) => (zone['points'] as List).isNotEmpty).map((zone) {
      final points = zone['points'] as List<LatLng>;
      double centerLat = 0, centerLng = 0;
      for (var p in points) { centerLat += p.latitude; centerLng += p.longitude; }
      centerLat /= points.length; centerLng /= points.length;
      
      return Marker(
        point: LatLng(centerLat, centerLng),
        width: 30,
        height: 30,
        child: const Icon(
          Icons.location_on,
          color: AppColors.secondary,
          size: 24,
        ),
      );
    }).toList();

    setState(() {
      _geofencePolygons = polygons;
      _markers.addAll(zoneMarkers);
    });

    // Check boundary status with existing location
    _checkGeofenceStatus(_currentCenter);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Work Boundaries', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: AppColors.surface,
        elevation: 0.5,
        actions: [
          IconButton(
            icon: const Icon(Icons.gps_fixed),
            onPressed: _fetchCurrentLocation,
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: _isLoading
          ? _buildMapSkeleton()
          : Stack(
              children: [
                FlutterMap(
                  mapController: _mapController,
                  options: MapOptions(
                    initialCenter: _currentCenter,
                    initialZoom: 13.0,
                  ),
                  children: [
                    if (_mapToken != null)
                      TileLayer(
                        urlTemplate: 'https://apis.mappls.com/advancedmaps/v1/$_mapToken/retina_map/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.eazzio.eazziopayroll',
                      )
                    else
                      TileLayer(
                        urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
                        userAgentPackageName: 'com.eazzio.eazziopayroll',
                      ),
                    PolygonLayer(
                      polygons: _geofencePolygons,
                    ),
                    MarkerLayer(
                      markers: _markers,
                    ),
                  ],
                ),
                
                // Bottom Info Card & Toggle Switch
                Positioned(
                  bottom: 16,
                  left: 16,
                  right: 16,
                  child: Card(
                    elevation: 6,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: const BorderSide(color: AppColors.outlineVariant, width: 0.5),
                    ),
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Header and Status Badge
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'My Location',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.onSurface,
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: _isInsideZone 
                                      ? AppColors.secondary.withOpacity(0.1) 
                                      : AppColors.error.withOpacity(0.1),
                                  borderRadius: BorderRadius.circular(20),
                                  border: Border.all(
                                    color: _isInsideZone ? AppColors.secondary : AppColors.error,
                                    width: 1,
                                  ),
                                ),
                                child: Row(
                                  mainAxisSize: MainAxisSize.min,
                                  children: [
                                    Container(
                                      width: 6,
                                      height: 6,
                                      decoration: BoxDecoration(
                                        color: _isInsideZone ? AppColors.secondary : AppColors.error,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 6),
                                    Text(
                                      _isInsideZone ? 'INSIDE ZONE' : 'OUTSIDE ZONE',
                                      style: TextStyle(
                                        fontSize: 9,
                                        fontWeight: FontWeight.bold,
                                        color: _isInsideZone ? AppColors.secondary : AppColors.error,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const Divider(height: 20),
                          
                          // Coordinate / Address Details and Speed
                          Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Row(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Container(
                                      width: 36,
                                      height: 36,
                                      decoration: BoxDecoration(
                                        color: AppColors.primary.withOpacity(0.1),
                                        shape: BoxShape.circle,
                                      ),
                                      child: const Icon(
                                        Icons.business,
                                        color: AppColors.primary,
                                        size: 20,
                                      ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          const Text(
                                            'Current Coordinates',
                                            style: TextStyle(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: AppColors.onSurfaceVariant,
                                            ),
                                          ),
                                          const SizedBox(height: 2),
                                          Text(
                                            'Lat: ${_currentCenter.latitude.toStringAsFixed(6)}\nLng: ${_currentCenter.longitude.toStringAsFixed(6)}',
                                            style: const TextStyle(
                                              fontSize: 13,
                                              color: AppColors.onSurface,
                                            ),
                                          ),
                                          const SizedBox(height: 4),
                                          Text(
                                            _isInsideZone 
                                                ? 'Zone: $_currentZoneName' 
                                                : 'No active zone.',
                                            style: TextStyle(
                                              fontSize: 11,
                                              color: _isInsideZone ? AppColors.secondary : AppColors.outline,
                                              fontWeight: _isInsideZone ? FontWeight.w600 : FontWeight.normal,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              const SizedBox(width: 16),
                              // GPS Speedometer
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                decoration: BoxDecoration(
                                  color: AppColors.secondary.withOpacity(0.08),
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(color: AppColors.secondary.withOpacity(0.2)),
                                ),
                                child: Column(
                                  children: [
                                    const Icon(Icons.speed, color: AppColors.secondary, size: 24),
                                    const SizedBox(height: 6),
                                    Text(
                                      (_currentSpeed > 0 ? _currentSpeed * 3.6 : 0.0).toStringAsFixed(1),
                                      style: const TextStyle(
                                        fontSize: 20,
                                        fontWeight: FontWeight.bold,
                                        color: AppColors.secondary,
                                      ),
                                    ),
                                    const Text(
                                      'km/h',
                                      style: TextStyle(
                                        fontSize: 10,
                                        fontWeight: FontWeight.w500,
                                        color: AppColors.secondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 12),
                          
                          // Location sharing is system-controlled — always ON, visible to dispatcher.
                          // Employee cannot turn it off. Starts on Punch In, stops on Punch Out.
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.secondary.withOpacity(0.06),
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.secondary.withOpacity(0.3), width: 0.8),
                            ),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Row(
                                  children: [
                                    Container(
                                      width: 8,
                                      height: 8,
                                      decoration: const BoxDecoration(
                                        color: AppColors.secondary,
                                        shape: BoxShape.circle,
                                      ),
                                    ),
                                    const SizedBox(width: 10),
                                    const Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          'Share Location',
                                          style: TextStyle(
                                            fontSize: 13,
                                            fontWeight: FontWeight.bold,
                                            color: AppColors.onSurface,
                                          ),
                                        ),
                                        Text(
                                          'Always visible to dispatcher',
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: AppColors.onSurfaceVariant,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ],
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: AppColors.secondary.withOpacity(0.12),
                                    borderRadius: BorderRadius.circular(20),
                                  ),
                                  child: const Text(
                                    'ACTIVE',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.secondary,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
    );
  }

  // Map skeleton shown during SDK init and location fetch
  // Mirrors actual map layout to prevent layout shift
  Widget _buildMapSkeleton() {
    return Column(
      children: [
        // Top filter bar skeleton
        const Padding(
          padding: EdgeInsets.all(16),
          child: Row(
            children: [
              // Search/filter box skeleton
              Expanded(
                child: SkeletonBox(
                  height: 44,
                  borderRadius: 12,
                ),
              ),
              SizedBox(width: 12),
              // Filter button skeleton
              SkeletonBox(
                width: 44,
                height: 44,
                borderRadius: 12,
              ),
            ],
          ),
        ),

        // Map area skeleton — full width, large height
        Expanded(
          child: Stack(
            children: [
              // Main map placeholder
              const SkeletonBox(
                width: double.infinity,
                height: double.infinity,
                borderRadius: 0,
              ),

              // Fake map grid lines overlay
              // Horizontal and vertical lines to simulate map tiles
              CustomPaint(
                painter: _MapGridPainter(),
                size: Size.infinite,
              ),

              // Center location pin skeleton
              const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    SkeletonBox(
                      width: 40,
                      height: 40,
                      borderRadius: 20, // circle
                    ),
                    SizedBox(height: 4),
                    SkeletonBox(
                      width: 80,
                      height: 8,
                      borderRadius: 4,
                    ),
                  ],
                ),
              ),

              // Bottom employee info card skeleton
              Positioned(
                bottom: 16,
                left: 16,
                right: 16,
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.08),
                        blurRadius: 16,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Row(
                    children: [
                      // Avatar skeleton
                      SkeletonBox(
                        width: 44,
                        height: 44,
                        borderRadius: 22,
                      ),
                      SizedBox(width: 12),
                      // Name and location text skeleton
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            SkeletonBox(height: 14, width: 120, borderRadius: 4),
                            SizedBox(height: 8),
                            SkeletonBox(height: 10, width: 180, borderRadius: 4),
                          ],
                        ),
                      ),
                      SizedBox(width: 12),
                      // Status dot skeleton
                      SkeletonBox(
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

class _MapGridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFFE2E8F0)
      ..strokeWidth = 1.0;

    const double step = 60.0; // grid step size in dp

    // Draw vertical lines
    for (double x = 0; x < size.width; x += step) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }

    // Draw horizontal lines
    for (double y = 0; y < size.height; y += step) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
