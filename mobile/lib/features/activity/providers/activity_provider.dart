import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/activity_repository.dart';
import '../data/remote/activity_remote_mapper.dart';

final activityProvider =
    FutureProvider.autoDispose.family<ActivityTimeline, String>((
  Ref ref,
  String fundId,
) {
  return ref.watch(activityRepositoryProvider).fetchActivity(fundId);
});
