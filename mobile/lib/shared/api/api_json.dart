Map<String, dynamic> readDataEnvelope(Map<String, dynamic> json) {
  final data = json['data'];
  if (data is Map<String, dynamic>) {
    return data;
  }

  return <String, dynamic>{};
}

List<Map<String, dynamic>> readDataListEnvelope(Map<String, dynamic> json) {
  final data = json['data'];
  if (data is List) {
    return data.whereType<Map<String, dynamic>>().toList();
  }

  return <Map<String, dynamic>>[];
}
