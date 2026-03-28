package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class EventModel {

    private String name;
    private String description;
    private String trigger;
    private String channel;
    private String deliveryGuarantee;
    private String retryPolicy;
    private String since;
    private EventPayloadModel payload;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getTrigger() {
        return trigger;
    }

    public void setTrigger(String trigger) {
        this.trigger = trigger;
    }

    public String getChannel() {
        return channel;
    }

    public void setChannel(String channel) {
        this.channel = channel;
    }

    public String getDeliveryGuarantee() {
        return deliveryGuarantee;
    }

    public void setDeliveryGuarantee(String deliveryGuarantee) {
        this.deliveryGuarantee = deliveryGuarantee;
    }

    public String getRetryPolicy() {
        return retryPolicy;
    }

    public void setRetryPolicy(String retryPolicy) {
        this.retryPolicy = retryPolicy;
    }

    public String getSince() {
        return since;
    }

    public void setSince(String since) {
        this.since = since;
    }

    public EventPayloadModel getPayload() {
        return payload;
    }

    public void setPayload(EventPayloadModel payload) {
        this.payload = payload;
    }
}
