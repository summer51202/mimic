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
}
