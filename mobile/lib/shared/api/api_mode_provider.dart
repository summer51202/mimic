import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../config/app_config.dart';

final apiModeProvider = Provider<AppApiMode>((Ref ref) {
  return appConfig.apiMode;
});
