package org.swarch.servicies;

import jakarta.enterprise.context.ApplicationScoped;

import com.influxdb.client.InfluxDBClient;
import com.influxdb.client.InfluxDBClientFactory;
import com.influxdb.client.QueryApi;
import com.influxdb.query.FluxRecord;
import com.influxdb.query.FluxTable;

import java.util.List;
import java.util.Map;
import java.util.HashMap;

@ApplicationScoped
public class GetSensorDataServiceImpl implements GetSensorDataService {

  private final InfluxDBClient influxDBClient;
  private final String[] buckets = {"city_metrics", "vehicles_metrics", "buildings_metrics"};

  public GetSensorDataServiceImpl() {
    // Initialize InfluxDB client
    this.influxDBClient = InfluxDBClientFactory.create(
        "http://influxdb:8086",
        "digital-twin-admin-token".toCharArray(),
        "emergency-mgmt"
    );
  }

  @Override
  public Object extractDataFromDB() {
    Map<String, Object> allData = new HashMap<>();
    QueryApi queryApi = influxDBClient.getQueryApi();

    for (String bucket : buckets) {
      String flux = String.format(
          "from(bucket: \"%s\") |> range(start: -1h) |> limit(n: 10)",
          bucket
      );

      List<FluxTable> tables = queryApi.query(flux);
      for (FluxTable table : tables) {
        for (FluxRecord record : table.getRecords()) {
          String measurement = record.getMeasurement();
          Object value = record.getValue();
          // Store in map, e.g., city_metrics_temperature_value
          String key = bucket + "_" + measurement + "_value";
          allData.put(key, value);
          // Also store tags if needed
          record.getValues().forEach((k, v) -> {
            if (!k.equals("_value") && !k.equals("_time") && !k.equals("_measurement")) {
              allData.put(bucket + "_" + measurement + "_" + k, v);
            }
          });
        }
      }
    }

    // Print the extracted data
    System.out.println("########################################");
    System.out.println("Extracted Sensor Data from InfluxDB:");
    for (Map.Entry<String, Object> entry : allData.entrySet()) {
      System.out.println(entry.getKey() + ": " + entry.getValue());
    }
    System.out.println("End extracted data");
    System.out.println("########################################");

    return allData;
  }

}
