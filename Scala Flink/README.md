# FLINK Project
Flink word count project on Windows Subsystem Linux (WSL 2) running Ubuntu

## Requirements
- Java 8 or Java 11 ([link](https://vitux.com/how-to-setup-java_home-path-in-ubuntu/))
- Scala 2.11 or Scala 2.12 ([link](https://docs.scala-lang.org/getting-started/index.html))
- Apache Flink 1.14.1 ([link](https://nightlies.apache.org/flink/flink-docs-release-1.14//docs/try-flink/local_installation//))
- Download Wikipedia Corpus ([link](https://www.kaggle.com/datasets/ltcmdrdata/plain-text-wikipedia-202011))

### Step 0: Setting up a Flink environment
1. Create Scala Flink project on WSL 2 Ubuntu and specify project name and Scala version
```Console
$ sbt new githubUsername/flink-project.g8
```
2. Start local Flink Cluster
```Console
$ bin/start-cluster.sh 
```
3. To run the project, run the command and select the main class that contains the Flink job
```Console
$ sbt run
```
4. to close local cluster
```Console
$ bin/stop-cluster.sh 
```

### Step 1: Parse Wikipedia Pages 
Wikipedia dump files are stored as XML files. Flink DataStream Connectors currently do not have support for XML files. So we need to take the following steps
1. Parse all JSON files using existing Scala libraries
2. Extract text from each JSON file and write to new text files
3. A bigram conditional probability matrix can also be constructed during extraction
#### Step 1a: Create bigram tokenizer
1. Clean input by first splitting by periods, removing special characters
2. splitting by spaces using flatmap()
3. use sliding(2) to group bigrams
#### Step 1b: Create dictionary to keep count of occurences and probabilities
1. Use a dicrionary to keep track of the top 5 most probable words using bigram occurences
2. Dictionary is updated as more files are parsed
3. Provide default cases for words that do not have 5 unique "next" words

### Step 2: Create Flink job
1. create Flink job as Scala object and define a main function that takes an array of text file file paths as argument
2. define the stream execution environemnt
```Scala
import org.apache.flink.streaming.api.scala._
object WordCount {
    def main(args: Array[String]): Unit = {
        val params = CLI.fromArgs(args)
        val env = StreamExecutionEnvironment.getExecutionEnvironment
    }
}
```
3. Since input is bounded, we use the default BATCH execution mode
    - no need to make changes to env

### Step 3: Read Text Files 
([ref](https://github.com/apache/flink/blob/master/flink-examples/flink-examples-streaming/src/main/scala/org/apache/flink/streaming/scala/examples/wordcount/WordCount.scala))
Read file from text file path 
```Scala
// get input data
val text = params.input match {
    case Some(input) =>
    // Create a new file source that will read files from a given set of directories.
    // Each file will be processed as plain text and split based on newlines.
    val builder = FileSource.forRecordStreamFormat(new TextLineInputFormat, input:_*)
    params.discoveryInterval.foreach { duration =>
        // If a discovery interval is provided, the source will
        // continuously watch the given directories for new files.
        builder.monitorContinuously(duration)
    }
    env.fromSource(builder.build(), WatermarkStrategy.noWatermarks(), "file-input")
    case None =>
    env.fromElements(WordCountData.WORDS:_*).name("in-memory-input")
}
```

### Step 4: get word counts and print result  
1. get and store word counts
```Scala
// get input data
val counts =
      // The text lines read from the source are split into words
      // using a user-defined function. The tokenizer, implemented below,
      // will output each word as a (2-tuple) containing (word, 1)
      text.flatMap(new Tokenizer)
        .name("tokenizer")
        // keyBy groups tuples based on the "_1" field, the word.
        // Using a keyBy allows performing aggregations and other
        // stateful transformations over data on a per-key basis.
        // This is similar to a GROUP BY clause in a SQL query.
        .keyBy(_._1)
        // For each key, we perform a simple sum of the "1" field, the count.
        // If the input data stream is bounded, sum will output a final count for
        // each word. If it is unbounded, it will continuously output updates
        // each time it sees a new instance of each word in the stream.
        .sum(1)
        .name("counter")

counts.print()
```
#### Step 4a: Create tokenizer function
```Scala
 /**
   * Implements the string tokenizer that splits a sentence into words as a user-defined
   * FlatMapFunction. The function takes a line (String) and splits it into multiple pairs in the
   * form of "(word,1)".
   */
  final class Tokenizer extends FlatMapFunction[String, (String, Int)] {
    override def flatMap(value: String, out: Collector[(String, Int)]): Unit = for {
      token <- value.toLowerCase.split("\\W+")
      if token.nonEmpty
    } out.collect((token, 1))
  }
```

### Step 5: execute the job

```Scala
env.execute("WordCount")
```

### Final comments
Unfortunately, I ran into a lot of trouble for setting up Java, Scala and Flink on Windows 11 and WSL 2. I was not able to find a solution to fix all the errors in time, and I was not able to properly run Scala scripts with the Flink API. So instead, I have outlined here how I would've approached the project, if I were able to actually test my code. I have included links to all the resources I've referenced. Here are a few ways I thought I could improve my solution to better match the project requirements:
- Process the XML directly from Wikipedia dump within Flink
    - potentially using the XML and RichMapFunction ([link](https://stackoverflow.com/questions/54462742/how-to-use-scala-xml-with-apache-flink))
- Stream the text actually word by word instead of by the entire file
    - not sure how to do this