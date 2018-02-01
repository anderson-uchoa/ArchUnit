package com.tngtech.archunit.visual;

import java.io.File;
import java.net.URL;
import java.util.Arrays;

import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import org.junit.Test;

public class VisualizerTest {
    @Test
    public void name() throws Exception {
        URL url1 = new File(Visualizer.class.getResource(
                "/" + VisualizerTest.class.getName().replace('.', '/') + ".class")
                .getFile()).getParentFile().toPath().toUri().toURL();
        URL url2 = new File(Visualizer.class.getResource(
                "/" + Visualizer.class.getName().replace('.', '/') + ".class")
                .getFile()).getParentFile().toPath().toUri().toURL();
        JavaClasses classes = new ClassFileImporter().importUrls(Arrays.asList(url1, url2));
        new Visualizer().visualize(classes,
                new File(new File(Visualizer.class.getResource("/").getFile()), "foo"),
                new VisualizationContext.Builder()
                        .ignoreAccessToSuperConstructor()
                        .includeOnly("com.tngtech.archunit.visual", "java.io.File", "com.google.common.io")
                        .build());
    }
}