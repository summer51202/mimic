import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../data/home_repository.dart';

final homeSummaryProvider = FutureProvider.autoDispose<HomeSummary>((Ref ref) {
  return ref.watch(homeRepositoryProvider).fetchSummary();
});
