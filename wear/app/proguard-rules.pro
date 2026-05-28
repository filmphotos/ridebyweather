# kotlinx.serialization keeps generated serializers via the compiler plugin.
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.**

# Keep @Serializable classes and their synthetic serializer companions.
-keepclassmembers class **$$serializer { *; }
-keepclasseswithmembers class com.ridebyweather.wear.data.** {
    *** Companion;
}
-keep class com.ridebyweather.wear.data.** { *; }

# OkHttp / Okio (release builds)
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn org.conscrypt.**
