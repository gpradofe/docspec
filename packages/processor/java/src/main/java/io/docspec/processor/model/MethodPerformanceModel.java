package io.docspec.processor.model;

import com.fasterxml.jackson.annotation.JsonInclude;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public class MethodPerformanceModel {

    private String expectedLatency;
    private String bottleneck;

    public String getExpectedLatency() {
        return expectedLatency;
    }

    public void setExpectedLatency(String expectedLatency) {
        this.expectedLatency = expectedLatency;
    }

    public String getBottleneck() {
        return bottleneck;
    }

    public void setBottleneck(String bottleneck) {
        this.bottleneck = bottleneck;
    }
}
