import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../../shared/storage/secure_storage_provider.dart';

const String _selectedGroupKey = 'pairfund.selected_group_id';

abstract class SelectedGroupPersistence {
  Future<String?> read();

  Future<void> write(String groupId);

  Future<void> clear();
}

class SecureSelectedGroupPersistence implements SelectedGroupPersistence {
  SecureSelectedGroupPersistence(this._storage);

  final FlutterSecureStorage _storage;

  @override
  Future<String?> read() => _storage.read(key: _selectedGroupKey);

  @override
  Future<void> write(String groupId) =>
      _storage.write(key: _selectedGroupKey, value: groupId);

  @override
  Future<void> clear() => _storage.delete(key: _selectedGroupKey);
}

final selectedGroupPersistenceProvider = Provider<SelectedGroupPersistence>(
  (Ref ref) => SecureSelectedGroupPersistence(ref.watch(secureStorageProvider)),
);
