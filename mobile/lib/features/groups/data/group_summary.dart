class GroupSummary {
  const GroupSummary({
    required this.id,
    required this.name,
    required this.groupType,
    required this.memberCount,
    required this.role,
  });

  final String id;
  final String name;
  final String groupType;
  final int memberCount;
  final String role;

  @override
  bool operator ==(Object other) {
    return other is GroupSummary &&
        other.id == id &&
        other.name == name &&
        other.groupType == groupType &&
        other.memberCount == memberCount &&
        other.role == role;
  }

  @override
  int get hashCode => Object.hash(id, name, groupType, memberCount, role);
}
