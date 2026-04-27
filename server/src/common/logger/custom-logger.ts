import { LoggerService, LogLevel } from '@nestjs/common'
import * as fs from 'fs'
import * as path from 'path'

/**
 * 自定义日志服务
 *
 * 功能：
 * 1. 统一日志格式
 * 2. 根据环境动态调整日志级别
 * 3. 支持文件日志（生产环境）
 * 4. 敏感信息过滤
 */
export class CustomLogger implements LoggerService {
  private logLevels: LogLevel[] = ['log', 'error', 'warn', 'debug', 'verbose', 'fatal']
  private context?: string
  private logFilePath?: string

  constructor(context?: string) {
    this.context = context
    this.initLogFilePath()
  }

  /**
   * 初始化日志文件路径（仅生产环境）
   */
  private initLogFilePath() {
    const isProduction = process.env.NODE_ENV === 'production'
    if (isProduction) {
      const logsDir = path.join(process.cwd(), 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }
      const date = new Date().toISOString().split('T')[0]
      this.logFilePath = path.join(logsDir, `app-${date}.log`)
    }
  }

  /**
   * 格式化日志消息
   */
  private formatMessage(
    level: LogLevel,
    message: any,
    context?: string,
    trace?: string
  ): string {
    const timestamp = new Date().toISOString()
    const ctx = context || this.context || 'Application'

    const levelMap: Record<LogLevel, string> = {
      log: 'INFO',
      error: 'ERROR',
      warn: 'WARN',
      debug: 'DEBUG',
      verbose: 'VERBOSE',
      fatal: 'FATAL'
    }

    const formattedMessage =
      typeof message === 'object'
        ? JSON.stringify(message, null, 2)
        : String(message)

    let logLine = `[${timestamp}] [${levelMap[level]}] [${ctx}] ${formattedMessage}`

    if (trace) {
      logLine += `\n${trace}`
    }

    return logLine
  }

  /**
   * 过滤敏感信息
   */
  private sanitizeMessage(message: any): any {
    if (typeof message === 'string') {
      // 过滤敏感字段
      return message
        .replace(/password["\s]*[:=]["\s]*[^,\s}"]+/gi, 'password=***')
        .replace(/token["\s]*[:=]["\s]*[^,\s}"]+/gi, 'token=***')
        .replace(/secret["\s]*[:=]["\s]*[^,\s}"]+/gi, 'secret=***')
        .replace(/api[_-]?key["\s]*[:=]["\s]*[^,\s}"]+/gi, 'apiKey=***')
    } else if (typeof message === 'object' && message !== null) {
      const sanitized = { ...message }
      const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key', 'authorization']

      sensitiveFields.forEach(field => {
        if (sanitized[field]) {
          sanitized[field] = '***'
        }
      })

      return sanitized
    }

    return message
  }

  /**
   * 写入日志到文件
   */
  private writeToFile(message: string) {
    if (this.logFilePath) {
      try {
        fs.appendFileSync(this.logFilePath, message + '\n', 'utf8')
      } catch (error) {
        console.error('写入日志文件失败:', error)
      }
    }
  }

  /**
   * 记录日志（内部方法）
   */
  private internalLog(level: LogLevel, message: any, context?: string, trace?: string) {
    const sanitizedMessage = this.sanitizeMessage(message)
    const formattedMessage = this.formatMessage(level, sanitizedMessage, context, trace)

    // 控制台输出
    const isProduction = process.env.NODE_ENV === 'production'

    // 生产环境只输出 warn 和 error
    if (isProduction && level !== 'warn' && level !== 'error') {
      this.writeToFile(formattedMessage)
      return
    }

    // 开发环境输出所有级别
    console.log(formattedMessage)
    this.writeToFile(formattedMessage)
  }

  /**
   * Log 级别
   */
  log(message: any, context?: string) {
    this.internalLog('log', message, context)
  }

  /**
   * Error 级别
   */
  error(message: any, trace?: string, context?: string) {
    this.internalLog('error', message, context, trace)
  }

  /**
   * Warn 级别
   */
  warn(message: any, context?: string) {
    this.internalLog('warn', message, context)
  }

  /**
   * Debug 级别
   */
  debug(message: any, context?: string) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (isDevelopment) {
      this.internalLog('debug', message, context)
    }
  }

  /**
   * Verbose 级别
   */
  verbose(message: any, context?: string) {
    const isDevelopment = process.env.NODE_ENV === 'development'
    if (isDevelopment) {
      this.internalLog('verbose', message, context)
    }
  }

  /**
   * Fatal 级别
   */
  fatal(message: any, context?: string) {
    this.internalLog('fatal', message, context)
  }

  /**
   * 设置上下文
   */
  setContext(context: string) {
    this.context = context
  }
}

/**
 * 日志工具函数
 */
export class LoggerHelper {
  /**
   * 创建自定义 Logger
   */
  static createLogger(context?: string): CustomLogger {
    return new CustomLogger(context)
  }

  /**
   * 格式化错误消息
   */
  static formatError(error: Error): string {
    if (!error) return 'Unknown error'

    return `${error.name}: ${error.message}\n${error.stack}`
  }

  /**
   * 脱敏处理
   */
  static maskSensitiveValue(value: string, visibleChars: number = 4): string {
    if (!value) return '***'
    if (value.length <= visibleChars * 2) return '***'

    const start = value.substring(0, visibleChars)
    const end = value.substring(value.length - visibleChars)
    const middle = '*'.repeat(value.length - visibleChars * 2)

    return `${start}${middle}${end}`
  }
}
