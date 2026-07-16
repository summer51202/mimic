import 'package:flutter/foundation.dart';

class GroupMemberSummary {
  const GroupMemberSummary({
    required this.id,
    required this.displayName,
    required this.role,
  });

  final String id;
  final String displayName;
  final String role;

  @override
  bool operator ==(Object other) =>
      other is GroupMemberSummary &&
      other.id == id &&
      other.displayName == displayName &&
      other.role == role;

  @override
  int get hashCode => Object.hash(id, displayName, role);
}

class GroupSummary {
  const GroupSummary({
    required this.id,
    required this.name,
    required this.groupType,
    required this.memberCount,
    required this.role,
    this.members = const <GroupMemberSummary>[],
  });

  final String id;
  final String name;
  final String groupType;
  final int memberCount;
  final String role;
  final List<GroupMemberSummary> members;

  @override
  bool operator ==(Object other) {
    return other is GroupSummary &&
        other.id == id &&
        other.name == name &&
        other.groupType == groupType &&
        other.memberCount == memberCount &&
        other.role == role &&
        listEquals(other.members, members);
  }

  @override
  int get hashCode => Object.hash(
        id,
        name,
        groupType,
        memberCount,
        role,
        Object.hashAll(members),
      );
}
