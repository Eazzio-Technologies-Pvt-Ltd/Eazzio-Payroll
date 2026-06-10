import 'package:flutter/material.dart';
import 'package:shimmer/shimmer.dart';

class TaskSkeletonCard extends StatelessWidget {
  const TaskSkeletonCard({super.key});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Shimmer.fromColors(
        baseColor: Colors.grey[300]!,
        highlightColor: Colors.grey[100]!,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    width: 150,
                    height: 20,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                  ),
                  Container(
                    width: 70,
                    height: 24,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Container(width: 16, height: 16, color: Colors.white),
                  const SizedBox(width: 8),
                  Container(width: 100, height: 14, color: Colors.white),
                ],
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Container(width: 16, height: 16, color: Colors.white),
                  const SizedBox(width: 8),
                  Container(width: 180, height: 14, color: Colors.white),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
