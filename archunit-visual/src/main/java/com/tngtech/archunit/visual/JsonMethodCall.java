package com.tngtech.archunit.visual;

import com.google.gson.annotations.Expose;

class JsonMethodCall {
    @Expose
    private String to;
    @Expose
    private String startCodeUnit;
    @Expose
    private String targetElement;

    JsonMethodCall(String to, String startCodeUnit, String targetElement) {
        this.to = to;
        this.startCodeUnit = startCodeUnit;
        this.targetElement = targetElement;
    }

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;

        JsonMethodCall that = (JsonMethodCall) o;

        if (to != null ? !to.equals(that.to) : that.to != null) return false;
        if (startCodeUnit != null ? !startCodeUnit.equals(that.startCodeUnit) : that.startCodeUnit != null)
            return false;
        return targetElement != null ? targetElement.equals(that.targetElement) : that.targetElement == null;
    }

    @Override
    public int hashCode() {
        int result = to != null ? to.hashCode() : 0;
        result = 31 * result + (startCodeUnit != null ? startCodeUnit.hashCode() : 0);
        result = 31 * result + (targetElement != null ? targetElement.hashCode() : 0);
        return result;
    }
}
