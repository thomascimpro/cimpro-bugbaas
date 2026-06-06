package nl.cimpro.bugbaas

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.DistanceRecord
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneId

class BugBaasNativeModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {
  private val scope = CoroutineScope(Dispatchers.IO)

  override fun getName(): String = "BugBaasNative"

  @ReactMethod
  fun getStepCounterSnapshot(promise: Promise) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      val permission = reactContext.checkSelfPermission(Manifest.permission.ACTIVITY_RECOGNITION)
      if (permission != PackageManager.PERMISSION_GRANTED) {
        val result = Arguments.createMap()
        result.putBoolean("available", false)
        result.putString("reason", "permission")
        promise.resolve(result)
        return
      }
    }

    val sensorManager = reactContext.getSystemService(Context.SENSOR_SERVICE) as SensorManager
    val sensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER)
    if (sensor == null) {
      val result = Arguments.createMap()
      result.putBoolean("available", false)
      result.putString("reason", "sensor")
      promise.resolve(result)
      return
    }

    val handler = Handler(Looper.getMainLooper())
    var settled = false
    lateinit var listener: SensorEventListener
    listener = object : SensorEventListener {
      override fun onSensorChanged(event: SensorEvent) {
        if (settled) return
        settled = true
        sensorManager.unregisterListener(listener)
        val result = Arguments.createMap()
        result.putBoolean("available", true)
        result.putDouble("stepsSinceBoot", event.values.firstOrNull()?.toDouble() ?: 0.0)
        result.putDouble("capturedAt", System.currentTimeMillis().toDouble())
        promise.resolve(result)
      }

      override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) = Unit
    }

    sensorManager.registerListener(listener, sensor, SensorManager.SENSOR_DELAY_NORMAL, handler)
    handler.postDelayed({
      if (settled) return@postDelayed
      settled = true
      sensorManager.unregisterListener(listener)
      val result = Arguments.createMap()
      result.putBoolean("available", false)
      result.putString("reason", "timeout")
      promise.resolve(result)
    }, 1800)
  }

  @ReactMethod
  fun getExerciseDistanceSnapshot(promise: Promise) {
    val status = HealthConnectClient.getSdkStatus(reactContext)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      val result = Arguments.createMap()
      result.putBoolean("available", false)
      result.putString("reason", "health_connect_unavailable")
      promise.resolve(result)
      return
    }

    scope.launch {
      try {
        val client = HealthConnectClient.getOrCreate(reactContext)
        val permissions = healthPermissions()
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.containsAll(permissions)) {
          val result = Arguments.createMap()
          result.putBoolean("available", false)
          result.putString("reason", "health_permission")
          promise.resolve(result)
          return@launch
        }

        val zone = ZoneId.systemDefault()
        val start = LocalDate.now(zone).atStartOfDay(zone).toInstant()
        val end = Instant.now()
        val sessions = client.readRecords(
          ReadRecordsRequest(
            recordType = ExerciseSessionRecord::class,
            timeRangeFilter = TimeRangeFilter.between(start, end)
          )
        ).records

        var walkingMeters = 0.0
        var runningMeters = 0.0
        var cyclingMeters = 0.0
        for (session in sessions) {
          val bucket = exerciseBucket(session.exerciseType) ?: continue
          val distance = distanceMetersForSession(client, session.startTime, session.endTime)
          when (bucket) {
            "walking" -> walkingMeters += distance
            "running" -> runningMeters += distance
            "cycling" -> cyclingMeters += distance
          }
        }
        val stepMeters = stepMetersForRange(client, start, end)
        walkingMeters = maxOf(walkingMeters, stepMeters)

        val result = Arguments.createMap()
        result.putBoolean("available", true)
        result.putDouble("capturedAt", System.currentTimeMillis().toDouble())
        result.putDouble("walkingMeters", walkingMeters)
        result.putDouble("runningMeters", runningMeters)
        result.putDouble("cyclingMeters", cyclingMeters)
        promise.resolve(result)
      } catch (error: Exception) {
        val result = Arguments.createMap()
        result.putBoolean("available", false)
        result.putString("reason", "health_error")
        promise.resolve(result)
      }
    }
  }

  @ReactMethod
  fun requestHealthPermissions(promise: Promise) {
    val status = HealthConnectClient.getSdkStatus(reactContext)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      promise.resolve(false)
      return
    }

    val activity = reactContext.currentActivity
    if (activity == null) {
      promise.resolve(false)
      return
    }

    try {
      val contract = PermissionController.createRequestPermissionResultContract()
      val intent = contract.createIntent(reactContext, healthPermissions())
      activity.startActivityForResult(intent, healthPermissionRequestCode)
      promise.resolve(true)
    } catch (_: Exception) {
      promise.resolve(false)
    }
  }

  @ReactMethod
  fun enqueueRadarBugs(bugIds: ReadableArray, promise: Promise) {
    val ids = mutableListOf<String>()
    for (index in 0 until bugIds.size()) {
      bugIds.getString(index)?.let { ids.add(it) }
    }
    val added = BugRadarWidgetProvider.enqueueRadarBugs(reactContext, ids)
    promise.resolve(added)
  }

  private suspend fun distanceMetersForSession(client: HealthConnectClient, start: Instant, end: Instant): Double {
    return client.readRecords(
      ReadRecordsRequest(
        recordType = DistanceRecord::class,
        timeRangeFilter = TimeRangeFilter.between(start, end)
      )
    ).records.sumOf { it.distance.inMeters }
  }

  private suspend fun stepMetersForRange(client: HealthConnectClient, start: Instant, end: Instant): Double {
    val steps = client.readRecords(
      ReadRecordsRequest(
        recordType = StepsRecord::class,
        timeRangeFilter = TimeRangeFilter.between(start, end)
      )
    ).records.sumOf { it.count }
    return steps * estimatedMetersPerStep
  }

  private fun exerciseBucket(type: Int): String? {
    return when (type) {
      ExerciseSessionRecord.EXERCISE_TYPE_WALKING,
      ExerciseSessionRecord.EXERCISE_TYPE_HIKING -> "walking"
      ExerciseSessionRecord.EXERCISE_TYPE_RUNNING,
      ExerciseSessionRecord.EXERCISE_TYPE_RUNNING_TREADMILL -> "running"
      ExerciseSessionRecord.EXERCISE_TYPE_BIKING,
      ExerciseSessionRecord.EXERCISE_TYPE_BIKING_STATIONARY -> "cycling"
      else -> null
    }
  }

  private fun healthPermissions(): Set<String> {
    return setOf(
      HealthPermission.getReadPermission(DistanceRecord::class),
      HealthPermission.getReadPermission(ExerciseSessionRecord::class),
      HealthPermission.getReadPermission(StepsRecord::class)
    )
  }

  companion object {
    private const val estimatedMetersPerStep = 0.75
    private const val healthPermissionRequestCode = 8104
  }
}
