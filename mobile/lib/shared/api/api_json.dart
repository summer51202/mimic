Map<String, dynamic> readDataEnvelope(Map<String, dynamic> json) {
  final data = json['data'];
  if (data is Map<String, dynamic>) {
    return data;
  }
  if (data is Map) {
    return Map<String, dynamic>.from(data);
  }

  return <String, dynamic>{};
}

List<Map<String, dynamic>> readDataListEnvelope(Map<String, dynamic> json) {
  final data = json['data'];
  if (data is List) {
    return data
        .whereType<Map>()
        .map((item) => Map<String, dynamic>.from(item))
        .toList();
  }

  return <Map<String, dynamic>>[];
}
