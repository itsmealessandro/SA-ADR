package org.swarch;

public class NotificationMessage {

  private String message;
  private String severity;
  private String source;
  private String timestamp;

  public NotificationMessage() {
  }

  public NotificationMessage(String message, String severity, String source, String timestamp) {
    this.message = message;
    this.severity = severity;
    this.source = source;
    this.timestamp = timestamp;
  }

  public String getMessage() {
    return message;
  }

  public void setMessage(String message) {
    this.message = message;
  }

  public String getSeverity() {
    return severity;
  }

  public void setSeverity(String severity) {
    this.severity = severity;
  }

  public String getSource() {
    return source;
  }

  public void setSource(String source) {
    this.source = source;
  }

  public String getTimestamp() {
    return timestamp;
  }

  public void setTimestamp(String timestamp) {
    this.timestamp = timestamp;
  }
}
