package com.tngtech.archunit.visual;

import java.io.File;
import java.util.HashSet;
import java.util.Set;

import com.google.common.collect.ImmutableSet;
import com.google.common.collect.Iterables;
import com.google.common.collect.Sets;
import com.tngtech.archunit.core.domain.JavaClass;
import com.tngtech.archunit.core.domain.JavaClasses;
import com.tngtech.archunit.core.importer.ClassFileImporter;
import com.tngtech.archunit.visual.testclasses.OtherClass;
import com.tngtech.archunit.visual.testclasses.SomeClass;
import com.tngtech.archunit.visual.testclasses.ThirdClass;
import com.tngtech.archunit.visual.testclasses.subpkg.SecondSubPkgClass;
import com.tngtech.archunit.visual.testclasses.subpkg.SubPkgClass;
import com.tngtech.archunit.visual.testclasses.subpkg.ThirdSubPkgClass;
import org.junit.Test;

import static org.assertj.core.api.Assertions.assertThat;

public class VisualizedClassesTest {
    private static final Class<?> SUB_PKG_CLASS_DEPENDENCY = File.class;
    private static final Set<Class<?>> EXTRA_DEPENDENCIES_OF_TEST_CLASSES = ImmutableSet.of(
            Object.class, String.class, SUB_PKG_CLASS_DEPENDENCY);

    @Test
    public void contain_non_filtered_classes() {
        JavaClasses classes = new ClassFileImporter().importPackages(SomeClass.class.getPackage().getName());

        VisualizedClasses visualizedClasses = VisualizedClasses.from(classes, new VisualizationContext.Builder().build());
        Iterable<String> expected = Iterables.concat(namesOf(classes), namesOf(EXTRA_DEPENDENCIES_OF_TEST_CLASSES));
        assertThat(namesOf(visualizedClasses.getAll())).containsOnlyElementsOf(expected);

        visualizedClasses = VisualizedClasses.from(classes, new VisualizationContext.Builder()
                .includeOnly(SubPkgClass.class.getPackage().getName())
                .build());
        assertThat(visualizedClasses.getAll()).doesNotContain(classes.get(SomeClass.class));
        assertThat(namesOf(visualizedClasses.getAll())).doesNotContain(SUB_PKG_CLASS_DEPENDENCY.getName());
    }

    @Test
    public void contain_non_inner_classes() {
        JavaClasses classes = new ClassFileImporter().importPackages(SomeClass.class.getPackage().getName());

        VisualizedClasses visualizedClasses = VisualizedClasses.from(classes, new VisualizationContext.Builder().build());

        assertThat(visualizedClasses.getClasses()).containsOnlyElementsOf(nonInnerClassesIn(classes));
    }

    @Test
    public void contain_inner_classes() {
        JavaClasses classes = new ClassFileImporter().importPackages(SomeClass.class.getPackage().getName());

        VisualizedClasses visualizedClasses = VisualizedClasses.from(classes, new VisualizationContext.Builder().build());

        assertThat(visualizedClasses.getInnerClasses()).containsOnlyElementsOf(innerClassesIn(classes));
    }

    @Test
    public void contain_dependencies() {
        JavaClasses classes = new ClassFileImporter().importPackages(SomeClass.class.getPackage().getName());

        VisualizedClasses visualizedClasses = VisualizedClasses.from(classes, new VisualizationContext.Builder().build());

        assertThat(namesOf(visualizedClasses.getDependencies()))
                .containsOnlyElementsOf(namesOf(EXTRA_DEPENDENCIES_OF_TEST_CLASSES));
    }

    @Test
    public void contain_packages() {
        JavaClasses classes = new ClassFileImporter().importPackages(SomeClass.class.getPackage().getName());

        VisualizedClasses visualizedClasses = VisualizedClasses.from(classes, new VisualizationContext.Builder().build());

        Set<String> expectedPackages = Sets.union(
                ImmutableSet.of(SomeClass.class.getPackage().getName(), SubPkgClass.class.getPackage().getName()),
                packagesOf(EXTRA_DEPENDENCIES_OF_TEST_CLASSES));
        assertThat(visualizedClasses.getPackages()).containsOnlyElementsOf(expectedPackages);
    }

    private Set<String> namesOf(Set<Class<?>> classes) {
        return ImmutableSet.copyOf(JavaClass.namesOf(classes.toArray(new Class<?>[classes.size()])));
    }

    private Iterable<String> namesOf(Iterable<JavaClass> all) {
        Set<String> result = new HashSet<>();
        for (JavaClass javaClass : all) {
            result.add(javaClass.getName());
        }
        return result;
    }

    private Set<String> packagesOf(Set<Class<?>> classes) {
        Set<String> result = new HashSet<>();
        for (Class<?> clazz : classes) {
            result.add(clazz.getPackage().getName());
        }
        return result;
    }

    private Set<JavaClass> nonInnerClassesIn(JavaClasses classes) {
        return ImmutableSet.of(
                classes.get(SomeClass.class), classes.get(OtherClass.class), classes.get(ThirdClass.class),
                classes.get(SubPkgClass.class), classes.get(SecondSubPkgClass.class), classes.get(ThirdSubPkgClass.class)
        );
    }

    private Set<JavaClass> innerClassesIn(JavaClasses classes) {
        return ImmutableSet.of(classes.get(SomeClass.InnerClass.class), classes.get(SubPkgClass.InnerSubPkgClass.class));
    }
}