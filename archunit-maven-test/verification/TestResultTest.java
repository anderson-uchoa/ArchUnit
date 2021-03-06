import java.io.File;
import java.io.IOException;
import java.lang.reflect.Field;
import java.lang.reflect.Method;
import java.net.URISyntaxException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.attribute.BasicFileAttributes;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

import com.tngtech.archunit.junit.ArchRules;
import com.tngtech.archunit.junit.ArchTest;
import com.tngtech.archunit.lang.ArchRule;
import com.tngtech.archunit.thirdparty.com.google.common.collect.ImmutableSet;
import org.joox.Match;
import org.junit.Test;
import org.xml.sax.SAXException;

import static com.tngtech.archunit.thirdparty.com.google.common.base.Preconditions.checkState;
import static org.assertj.core.api.Assertions.assertThat;
import static org.joox.JOOX.$;

public class TestResultTest {
    private static final File rootFolder = findRootFolder();

    @Test
    public void test_result_matches() throws Exception {
        GivenTestClasses givenTestClasses = GivenTestClasses.findAll();

        ImportedTestResults importedTestResults = ImportedTestResults.importAll();

        importedTestResults.assertMatchWith(givenTestClasses);
    }

    private static File findRootFolder() {
        File file = fileFromResource("/");
        while (!new File(file, "pom.xml").exists()) {
            file = file.getParentFile();
        }
        return file;
    }

    private static File fileFromResource(String resourceName) {
        try {
            return new File(TestResultTest.class.getResource(resourceName).toURI());
        } catch (URISyntaxException e) {
            throw new RuntimeException(e);
        }
    }

    private static class GivenTestClasses {
        private final Set<SingleTest> tests = new HashSet<>();

        GivenTestClasses(Set<Class<?>> testClasses) {
            for (Class<?> testClass : testClasses) {
                tests.addAll(getTestsIn(testClass));
            }
            checkState(!tests.isEmpty(), "No given tests found");
        }

        private Set<SingleTest> getTestsIn(Class<?> clazz) {
            Set<SingleTest> result = new HashSet<>();
            result.addAll(getTestMethods(ImmutableSet.copyOf(clazz.getMethods())));
            result.addAll(getTestFields(ImmutableSet.copyOf(clazz.getFields())));
            return result;
        }

        private Set<SingleTest> getTestMethods(Iterable<Method> methods) {
            Set<SingleTest> result = new HashSet<>();
            for (Method method : methods) {
                if (method.getAnnotation(ArchTest.class) != null || method.getAnnotation(Test.class) != null) {
                    result.add(new SingleTest(method.getDeclaringClass().getName(), method.getName()));
                }
            }
            return result;
        }

        private Set<SingleTest> getTestFields(Iterable<Field> fields) {
            Set<SingleTest> result = new HashSet<>();
            for (Field field : fields) {
                if (field.getAnnotation(ArchTest.class) != null) {
                    result.addAll(getTestFields(field));
                }
            }
            return result;
        }

        private Set<SingleTest> getTestFields(Field field) {
            if (ArchRule.class.isAssignableFrom(field.getType())) {
                return Collections.singleton(new SingleTest(field.getDeclaringClass().getName(), field.getName()));
            }
            if (ArchRules.class.isAssignableFrom(field.getType())) {
                return getTestsFrom(this.<ArchRules>getValue(field, null));
            }
            throw new IllegalStateException("Unknown @ArchTest: " + field);
        }

        private Set<SingleTest> getTestsFrom(ArchRules archRules) {
            Set<SingleTest> result = new HashSet<>();
            result.addAll(getTestFields(this.<Field>getValue(archRules, "fields")));
            result.addAll(getTestMethods(this.<Method>getValue(archRules, "methods")));
            return result;
        }

        private <T> Collection<T> getValue(ArchRules archRules, String name) {
            try {
                return getValue(ArchRules.class.getDeclaredField(name), archRules);
            } catch (NoSuchFieldException e) {
                throw new RuntimeException(e);
            }
        }

        @SuppressWarnings("unchecked")
        private <T> T getValue(Field field, Object owner) {
            try {
                field.setAccessible(true);
                return (T) field.get(owner);
            } catch (IllegalAccessException e) {
                throw new RuntimeException(e);
            }
        }

        static GivenTestClasses findAll() throws IOException {
            final Set<Class<?>> classes = new HashSet<>();
            final Path root = fileFromResource("/").toPath();
            Files.walkFileTree(root, new SimpleFileVisitor<Path>() {
                @Override
                public FileVisitResult visitFile(Path file, BasicFileAttributes attrs) throws IOException {
                    String fileName = file.getFileName().toString();
                    if (fileName.endsWith("Test.class") && !fileName.contains(TestResultTest.class.getSimpleName())) {
                        String resolvedClassFile = root.relativize(file).toString();
                        classes.add(resolveClassFromFileName(resolvedClassFile));
                    }
                    return FileVisitResult.CONTINUE;
                }

                private Class<?> resolveClassFromFileName(String resolvedClassFile) {
                    try {
                        String className = resolvedClassFile
                                .replace(File.separatorChar, '.')
                                .replace(".class", "");
                        return Class.forName(className);
                    } catch (ClassNotFoundException e) {
                        throw new RuntimeException(e);
                    }
                }
            });
            return new GivenTestClasses(classes);
        }
    }

    private static class ImportedTestResults {
        private final Set<SingleTest> failedArchitectureTests = new HashSet<>();

        ImportedTestResults(List<File> testReports) throws IOException, SAXException {
            for (File report : testReports) {
                Match document = $($(report).document());

                failedArchitectureTests.addAll(getFailedTests(document.find("testcase")));
            }
            markProcessed(testReports);
        }

        Set<SingleTest> getFailedTests(Match testCaseTags) {
            validateAllArchitectureFailures(testCaseTags);

            List<String> classNames = testCaseTags.attrs("classname");
            List<String> testNames = testCaseTags.attrs("name");
            if (classNames.size() != testNames.size()) {
                throw new RuntimeException("Unexpected attrs mismatch, expected the same size: " + classNames + " <-> " + testNames);
            }

            Set<SingleTest> result = new HashSet<>();
            for (int i = 0; i < classNames.size(); i++) {
                result.add(new SingleTest(classNames.get(i), testNames.get(i)));
            }
            return result;
        }

        private void validateAllArchitectureFailures(Match testCaseTags) {
            assertThat(testCaseTags.find("error")).as("tests in error").isEmpty();

            List<String> messages = testCaseTags.find("failure").attrs("message");
            assertThat(testCaseTags).as("tests").hasSize(messages.size());
            for (String message : messages) {
                assertThat(message).startsWith("Architecture Violation");
            }
        }

        void assertMatchWith(GivenTestClasses givenTestClasses) {
            assertThat(failedArchitectureTests).isEqualTo(givenTestClasses.tests);
        }

        void markProcessed(List<File> testReports) {
            for (File report : testReports) {
                if (!report.renameTo(new File(report.getParentFile(), report.getName() + ".processed"))) {
                    throw new IllegalStateException("Couldn't mark " + report.getAbsolutePath() + " as processed");
                }
            }
        }

        @Override
        public String toString() {
            return "ImportedTestResult{failedArchitectureTests=" + failedArchitectureTests + '}';
        }

        static ImportedTestResults importAll() throws Exception {
            List<File> files = new ArrayList<>();
            for (File file : new File(rootFolder, "target/surefire-reports").listFiles()) {
                if (isRelevantTestReport(file.getName())) {
                    files.add(file);
                }
            }
            return new ImportedTestResults(files);
        }

        private static boolean isRelevantTestReport(String fileName) {
            return fileName.startsWith("TEST-") &&
                    fileName.endsWith(".xml") &&
                    !fileName.equals(String.format("TEST-%s.xml", TestResultTest.class.getName()));
        }
    }

    private static class SingleTest {
        private final String owner;
        private final String testName;

        private SingleTest(String owner, String testName) {
            this.owner = owner;
            this.testName = testName;
        }

        @Override
        public int hashCode() {
            return Objects.hash(owner, testName);
        }

        @Override
        public boolean equals(Object obj) {
            if (this == obj) {
                return true;
            }
            if (obj == null || getClass() != obj.getClass()) {
                return false;
            }
            final SingleTest other = (SingleTest) obj;
            return Objects.equals(this.owner, other.owner)
                    && Objects.equals(this.testName, other.testName);
        }

        @Override
        public String toString() {
            return "SingleTest{" +
                    "owner='" + owner + '\'' +
                    ", testName='" + testName + '\'' +
                    '}';
        }
    }
}
