const { app, BrowserWindow, ipcMain, dialog, screen, shell } = require('electron');
const path = require('path');
const url = require('url');
const fs = require('fs');
const { spawn } = require('child_process');
const os = require('os');

// 添加electron-squirrel-startup支持
if (require('electron-squirrel-startup')) {
  app.quit();
}

// 保持对窗口对象的全局引用，如果不这样做，当JavaScript对象被垃圾回收时，窗口会自动关闭
let mainWindow;

// 本地数据文件路径
const localDataPath = path.join(app.getPath('userData'), 'local-data.json');

// 检查系统架构是否兼容
function isSystemCompatible() {
  const arch = os.arch();
  const platform = os.platform();
  
  // 仅支持64位Windows系统
  return platform === 'win32' && arch === 'x64';
}

// 读取本地数据
function readLocalData() {
  try {
    console.log('[Data] Reading local data from:', localDataPath);
    if (fs.existsSync(localDataPath)) {
      const data = fs.readFileSync(localDataPath, 'utf8');
      console.log('[Data] Local data read successfully');
      return JSON.parse(data);
    } else {
      console.log('[Data] Local data file does not exist, returning empty object');
    }
  } catch (error) {
    console.error('[Data] Failed to read local data:', error);
  }
  return {};
}

// 保存本地数据
function saveLocalData(data) {
  try {
    console.log('[Data] Saving local data to:', localDataPath);
    console.log('[Data] Data to save:', JSON.stringify(data, null, 2));
    
    // 确保目录存在
    const dir = path.dirname(localDataPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('[Data] Created directory:', dir);
    }
    
    fs.writeFileSync(localDataPath, JSON.stringify(data, null, 2), 'utf8');
    console.log('[Data] Local data saved successfully');
    return true;
  } catch (error) {
    console.error('[Data] Failed to save local data:', error);
    return false;
  }
}

function createWindow() {
  // 获取屏幕尺寸
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  // 创建浏览器窗口，去除默认边框
  mainWindow = new BrowserWindow({
    width: Math.min(1200, width),
    height: Math.min(800, height),
    frame: false, // 去除默认边框
    icon: path.join(__dirname, 'icon-256.png'), // 设置窗口图标
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // 加载应用的index.html
  mainWindow.loadURL(
    url.format({
      pathname: path.join(__dirname, 'index.html'),
      protocol: 'file:',
      slashes: true
    })
  );

  // 打开开发者工具（调试时可取消注释）
  // mainWindow.webContents.openDevTools();

  // 当窗口关闭时触发
  mainWindow.on('closed', function () {
    // 取消对窗口对象的引用，通常会存储窗口在数组中，这是删除相应元素的时候
    mainWindow = null;
  });
}

// Electron会在初始化后调用这个方法
// 有些API只能在此事件发生后使用
app.whenReady().then(() => {
  // 设置应用图标
  if (process.platform === 'win32') {
    app.setAppUserModelId('com.ruanm.appstore');
  }
  
  // 首先检查系统兼容性
  if (!isSystemCompatible()) {
    // 创建一个简单的窗口显示不兼容信息
    const incompatibleWindow = new BrowserWindow({
      width: 500,
      height: 300,
      frame: false,
      resizable: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false
      }
    });
    
    incompatibleWindow.loadURL(`data:text/html,
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: 'Microsoft YaHei', Arial, sans-serif;
              background: #f5f5f5;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
            }
            .container {
              text-align: center;
              background: white;
              padding: 40px;
              border-radius: 10px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            h1 {
              color: #f44336;
              margin-bottom: 20px;
            }
            p {
              color: #666;
              margin-bottom: 30px;
              line-height: 1.6;
            }
            button {
              background: #f44336;
              color: white;
              border: none;
              padding: 12px 30px;
              font-size: 16px;
              border-radius: 25px;
              cursor: pointer;
              transition: background 0.3s;
            }
            button:hover {
              background: #d32f2f;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>系统不兼容</h1>
            <p>当前系统架构不兼容 Ruanm 应用商店。<br>本应用仅支持 64 位 Windows 系统。</p>
            <button onclick="require('electron').remote.getCurrentWindow().close()">关闭应用</button>
          </div>
        </body>
      </html>
    `);
    
    // 3秒后自动关闭应用
    setTimeout(() => {
      app.quit();
    }, 3000);
    
    return;
  }
  
  createWindow();

  app.on('activate', function () {
    // 在macOS上，当单击dock图标且没有其他窗口打开时，通常会重新创建一个窗口
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口都关闭时退出
app.on('window-all-closed', function () {
  // 在macOS上，应用程序及其菜单栏通常会保持活动状态，直到用户明确退出
  if (process.platform !== 'darwin') app.quit();
});

// 检查系统兼容性
ipcMain.handle('check-system-compatibility', () => {
  return isSystemCompatible();
});

// 在浏览器中打开下载链接
ipcMain.handle('open-download-link', (event, downloadUrl) => {
  console.log('[Download] Opening download link in browser:', downloadUrl);
  shell.openExternal(downloadUrl);
  return { success: true };
});

// 选择解压目录
ipcMain.handle('select-extract-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory']
  });
  
  if (!result.canceled && result.filePaths.length > 0) {
    return { success: true, path: result.filePaths[0] };
  }
  return { success: false };
});

// 运行阮铭泽工具箱.exe
ipcMain.handle('run-toolbox', (event, extractDir) => {
  try {
    console.log('[Run] Running toolbox from directory:', extractDir);
    
    // 查找阮铭泽工具箱.exe
    const toolboxExe = path.join(extractDir, '阮铭泽工具箱.exe');
    
    // 检查exe文件是否存在
    if (fs.existsSync(toolboxExe)) {
      console.log('[Run] Launching 阮铭泽工具箱.exe:', toolboxExe);
      // 运行exe文件
      const childProcess = spawn(toolboxExe, [], { detached: true, stdio: 'ignore' });
      // 保存进程ID以便后续关闭
      global.toolboxProcess = childProcess;
      return { success: true, pid: childProcess.pid };
    } else {
      // 如果找不到特定名称的exe，优先查找根目录的任何exe文件
      const files = fs.readdirSync(extractDir);
      let rootExe = null;
      
      // 先查找根目录的exe文件
      for (const file of files) {
        const fullPath = path.join(extractDir, file);
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory() && path.extname(file).toLowerCase() === '.exe') {
          rootExe = fullPath;
          break;
        }
      }
      
      if (rootExe) {
        console.log('[Run] Launching root exe file:', rootExe);
        const childProcess = spawn(rootExe, [], { detached: true, stdio: 'ignore' });
        // 保存进程ID以便后续关闭
        global.toolboxProcess = childProcess;
        return { success: true, pid: childProcess.pid };
      } else {
        // 如果根目录没有exe文件，再查找子目录中的exe文件
        const findExe = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              // 跳过resources目录
              if (file !== 'resources') {
                const result = findExe(fullPath);
                if (result) return result;
              }
            } else if (path.extname(file).toLowerCase() === '.exe') {
              return fullPath;
            }
          }
          return null;
        };
        
        const exePath = findExe(extractDir);
        if (exePath) {
          console.log('[Run] Launching exe file:', exePath);
          const childProcess = spawn(exePath, [], { detached: true, stdio: 'ignore' });
          // 保存进程ID以便后续关闭
          global.toolboxProcess = childProcess;
          return { success: true, pid: childProcess.pid };
        } else {
          console.error('[Run] No exe file found in directory');
          return { success: false, error: '在解压目录中未找到可执行文件' };
        }
      }
    }
  } catch (error) {
    console.error('[Run] Failed to run toolbox:', error);
    return { success: false, error: error.message };
  }
});

// 关闭阮铭泽工具箱进程
ipcMain.handle('close-toolbox', () => {
  try {
    console.log('[Close] Closing toolbox process');
    if (global.toolboxProcess) {
      const pid = global.toolboxProcess.pid;
      console.log('[Close] Toolbox process PID:', pid);
      
      // 尝试优雅地关闭进程
      global.toolboxProcess.kill('SIGTERM');
      
      // 等待一段时间后强制关闭
      setTimeout(() => {
        try {
          if (global.toolboxProcess && !global.toolboxProcess.killed) {
            // Windows下使用taskkill命令强制关闭进程
            console.log('[Close] Force killing toolbox process with PID:', pid);
            const killProcess = spawn('taskkill', ['/PID', pid.toString(), '/F'], { stdio: 'ignore' });
            killProcess.on('close', (code) => {
              console.log('[Close] taskkill process closed with code:', code);
              if (code === 0) {
                console.log('[Close] Toolbox process forcefully terminated successfully');
              } else {
                console.log('[Close] taskkill process exited with code:', code);
              }
            });
            killProcess.on('error', (error) => {
              console.error('[Close] Error executing taskkill command:', error);
            });
          }
        } catch (error) {
          console.error('[Close] Error force killing toolbox process:', error);
        }
      }, 2000);
      
      // 清除进程引用
      global.toolboxProcess = null;
      console.log('[Close] Toolbox process closed successfully');
      return { success: true };
    } else {
      console.log('[Close] No toolbox process found, trying to kill by name');
      // 如果没有进程引用，尝试通过任务管理器关闭
      try {
        console.log('[Close] Killing toolbox process by name: 阮铭泽工具箱.exe');
        const killProcess = spawn('taskkill', ['/IM', '阮铭泽工具箱.exe', '/F'], { stdio: 'ignore' });
        killProcess.on('close', (code) => {
          console.log('[Close] taskkill by name closed with code:', code);
          if (code === 0) {
            console.log('[Close] Toolbox process terminated by name successfully');
          } else {
            console.log('[Close] taskkill by name exited with code:', code);
          }
        });
        killProcess.on('error', (error) => {
          console.error('[Close] Error executing taskkill by name:', error);
        });
        return { success: true };
      } catch (error) {
        console.error('[Close] Error killing toolbox process by name:', error);
        return { success: true }; // 即使出错也返回成功，因为进程可能已经关闭
      }
    }
  } catch (error) {
    console.error('[Close] Failed to close toolbox process:', error);
    return { success: false, error: error.message };
  }
});

// 运行Everything.exe
ipcMain.handle('run-everything', (event, extractDir) => {
  try {
    console.log('[Run] Running Everything from directory:', extractDir);
    
    // 查找Everything.exe
    const everythingExe = path.join(extractDir, 'Everything.exe');
    
    // 检查exe文件是否存在
    if (fs.existsSync(everythingExe)) {
      console.log('[Run] Launching Everything.exe:', everythingExe);
      // 运行exe文件
      const childProcess = spawn(everythingExe, [], { detached: true, stdio: 'ignore' });
      // 保存进程ID以便后续关闭
      global.everythingProcess = childProcess;
      return { success: true, pid: childProcess.pid };
    } else {
      // 如果找不到特定名称的exe，优先查找根目录的任何exe文件
      const files = fs.readdirSync(extractDir);
      let rootExe = null;
      
      // 先查找根目录的exe文件
      for (const file of files) {
        const fullPath = path.join(extractDir, file);
        const stat = fs.statSync(fullPath);
        if (!stat.isDirectory() && path.extname(file).toLowerCase() === '.exe') {
          rootExe = fullPath;
          break;
        }
      }
      
      if (rootExe) {
        console.log('[Run] Launching root exe file:', rootExe);
        const childProcess = spawn(rootExe, [], { detached: true, stdio: 'ignore' });
        // 保存进程ID以便后续关闭
        global.everythingProcess = childProcess;
        return { success: true, pid: childProcess.pid };
      } else {
        // 如果根目录没有exe文件，再查找子目录中的exe文件
        const findExe = (dir) => {
          const files = fs.readdirSync(dir);
          for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
              // 跳过resources目录
              if (file !== 'resources') {
                const result = findExe(fullPath);
                if (result) return result;
              }
            } else if (path.extname(file).toLowerCase() === '.exe') {
              return fullPath;
            }
          }
          return null;
        };
        
        const exePath = findExe(extractDir);
        if (exePath) {
          console.log('[Run] Launching exe file:', exePath);
          const childProcess = spawn(exePath, [], { detached: true, stdio: 'ignore' });
          // 保存进程ID以便后续关闭
          global.everythingProcess = childProcess;
          return { success: true, pid: childProcess.pid };
        } else {
          console.error('[Run] No exe file found in directory');
          return { success: false, error: '在解压目录中未找到可执行文件' };
        }
      }
    }
  } catch (error) {
    console.error('[Run] Failed to run Everything:', error);
    return { success: false, error: error.message };
  }
});

// 关闭Everything进程
ipcMain.handle('close-everything', () => {
  try {
    console.log('[Close] Closing Everything process');
    if (global.everythingProcess) {
      const pid = global.everythingProcess.pid;
      console.log('[Close] Everything process PID:', pid);
      
      // 尝试优雅地关闭进程
      global.everythingProcess.kill('SIGTERM');
      
      // 等待一段时间后强制关闭
      setTimeout(() => {
        try {
          if (global.everythingProcess && !global.everythingProcess.killed) {
            // Windows下使用taskkill命令强制关闭进程
            console.log('[Close] Force killing Everything process with PID:', pid);
            const killProcess = spawn('taskkill', ['/PID', pid.toString(), '/F'], { stdio: 'ignore' });
            killProcess.on('close', (code) => {
              console.log('[Close] taskkill process closed with code:', code);
              if (code === 0) {
                console.log('[Close] Everything process forcefully terminated successfully');
              } else {
                console.log('[Close] taskkill process exited with code:', code);
              }
            });
            killProcess.on('error', (error) => {
              console.error('[Close] Error executing taskkill command:', error);
            });
          }
        } catch (error) {
          console.error('[Close] Error force killing Everything process:', error);
        }
      }, 2000);
      
      // 清除进程引用
      global.everythingProcess = null;
      console.log('[Close] Everything process closed successfully');
      return { success: true };
    } else {
      console.log('[Close] No Everything process found, trying to kill by name');
      // 如果没有进程引用，尝试通过任务管理器关闭
      try {
        console.log('[Close] Killing Everything process by name: Everything.exe');
        const killProcess = spawn('taskkill', ['/IM', 'Everything.exe', '/F'], { stdio: 'ignore' });
        killProcess.on('close', (code) => {
          console.log('[Close] taskkill by name closed with code:', code);
          if (code === 0) {
            console.log('[Close] Everything process terminated by name successfully');
          } else {
            console.log('[Close] taskkill by name exited with code:', code);
          }
        });
        killProcess.on('error', (error) => {
          console.error('[Close] Error executing taskkill by name:', error);
        });
        return { success: true };
      } catch (error) {
        console.error('[Close] Error killing Everything process by name:', error);
        return { success: true }; // 即使出错也返回成功，因为进程可能已经关闭
      }
    }
  } catch (error) {
    console.error('[Close] Failed to close Everything process:', error);
    return { success: false, error: error.message };
  }
});

// 运行7-Zip.exe
ipcMain.handle('run-7z', (event, installDir) => {
  try {
    console.log('[Run] Running 7-Zip from directory:', installDir);
    
    // 查找7zFM.exe (7-Zip文件管理器)
    const sevenZipExe = path.join(installDir, '7zFM.exe');
    
    // 检查exe文件是否存在
    if (fs.existsSync(sevenZipExe)) {
      console.log('[Run] Launching 7zFM.exe:', sevenZipExe);
      // 运行exe文件
      const childProcess = spawn(sevenZipExe, [], { detached: true, stdio: 'ignore' });
      // 保存进程ID以便后续关闭
      global.sevenZipProcess = childProcess;
      return { success: true, pid: childProcess.pid };
    } else {
      console.error('[Run] 7zFM.exe not found in directory:', sevenZipExe);
      return { success: false, error: '在安装目录中未找到7zFM.exe文件' };
    }
  } catch (error) {
    console.error('[Run] Failed to run 7-Zip:', error);
    return { success: false, error: error.message };
  }
});

// 关闭7-Zip进程
ipcMain.handle('close-7z', () => {
  try {
    console.log('[Close] Closing 7-Zip process');
    if (global.sevenZipProcess) {
      const pid = global.sevenZipProcess.pid;
      console.log('[Close] 7-Zip process PID:', pid);
      
      // 尝试优雅地关闭进程
      global.sevenZipProcess.kill('SIGTERM');
      
      // 等待一段时间后强制关闭
      setTimeout(() => {
        try {
          if (global.sevenZipProcess && !global.sevenZipProcess.killed) {
            // Windows下使用taskkill命令强制关闭进程
            console.log('[Close] Force killing 7-Zip process with PID:', pid);
            const killProcess = spawn('taskkill', ['/PID', pid.toString(), '/F'], { stdio: 'ignore' });
            killProcess.on('close', (code) => {
              console.log('[Close] taskkill process closed with code:', code);
              if (code === 0) {
                console.log('[Close] 7-Zip process forcefully terminated successfully');
              } else {
                console.log('[Close] taskkill process exited with code:', code);
              }
            });
            killProcess.on('error', (error) => {
              console.error('[Close] Error executing taskkill command:', error);
            });
          }
        } catch (error) {
          console.error('[Close] Error force killing 7-Zip process:', error);
        }
      }, 2000);
      
      // 清除进程引用
      global.sevenZipProcess = null;
      console.log('[Close] 7-Zip process closed successfully');
      return { success: true };
    } else {
      console.log('[Close] No 7-Zip process found, trying to kill by name');
      // 如果没有进程引用，尝试通过任务管理器关闭
      try {
        console.log('[Close] Killing 7-Zip process by name: 7zFM.exe');
        const killProcess = spawn('taskkill', ['/IM', '7zFM.exe', '/F'], { stdio: 'ignore' });
        killProcess.on('close', (code) => {
          console.log('[Close] taskkill by name closed with code:', code);
          if (code === 0) {
            console.log('[Close] 7-Zip process terminated by name successfully');
          } else {
            console.log('[Close] taskkill by name exited with code:', code);
          }
        });
        killProcess.on('error', (error) => {
          console.error('[Close] Error executing taskkill by name:', error);
        });
        return { success: true };
      } catch (error) {
        console.error('[Close] Error killing 7-Zip process by name:', error);
        return { success: true }; // 即使出错也返回成功，因为进程可能已经关闭
      }
    }
  } catch (error) {
    console.error('[Close] Failed to close 7-Zip process:', error);
    return { success: false, error: error.message };
  }
});

// 删除7-Zip
ipcMain.handle('delete-7z', (event, installDir) => {
  try {
    console.log('[Delete] Deleting 7-Zip from directory:', installDir);
    
    // 检查目录是否存在
    if (fs.existsSync(installDir)) {
      // 删除目录
      fs.rmSync(installDir, { recursive: true });
      console.log('[Delete] Directory deleted successfully');
      
      // 清除本地数据
      const localData = readLocalData();
      if (localData.sevenZipInstallDir === installDir) {
        delete localData.sevenZipInstallDir;
        const saveResult = saveLocalData(localData);
        if (!saveResult) {
          console.error('[Delete] Failed to save local data after deletion');
          return { success: false, error: '无法保存本地数据' };
        }
      }
      
      return { success: true };
    } else {
      console.error('[Delete] Directory does not exist');
      return { success: false, error: '目录不存在' };
    }
  } catch (error) {
    console.error('[Delete] Failed to delete 7-Zip:', error);
    return { success: false, error: error.message };
  }
});

// 运行Node.js
ipcMain.handle('run-node', (event, extractDir) => {
  try {
    console.log('[Run] Node.js run functionality has been disabled. Please configure PATH manually.');
    return { success: false, error: 'Node.js运行功能已禁用。请手动配置PATH环境变量后使用命令行工具。' };
  } catch (error) {
    console.error('[Run] Failed to run Node.js:', error);
    return { success: false, error: error.message };
  }
});

// 删除Node.js
ipcMain.handle('delete-node', (event, extractDir) => {
  try {
    console.log('[Delete] Deleting Node.js from directory:', extractDir);
    
    // 检查目录是否存在
    if (!fs.existsSync(extractDir)) {
      console.log('[Delete] Directory does not exist, nothing to delete');
      return { success: true };
    }
    
    // 删除目录
    fs.rmSync(extractDir, { recursive: true, force: true });
    console.log('[Delete] Node.js directory deleted successfully');
    return { success: true };
  } catch (error) {
    console.error('[Delete] Failed to delete Node.js:', error);
    return { success: false, error: error.message };
  }
});

// 删除工具箱
ipcMain.handle('delete-toolbox', (event, extractDir) => {
  try {
    console.log('[Delete] Deleting toolbox from directory:', extractDir);
    
    // 检查目录是否存在
    if (fs.existsSync(extractDir)) {
      // 删除目录
      fs.rmSync(extractDir, { recursive: true });
      console.log('[Delete] Directory deleted successfully');
      
      // 清除本地数据
      const localData = readLocalData();
      if (localData.extractDir === extractDir) {
        delete localData.extractDir;
        const saveResult = saveLocalData(localData);
        if (!saveResult) {
          console.error('[Delete] Failed to save local data after deletion');
          return { success: false, error: '无法保存本地数据' };
        }
      }
      
      return { success: true };
    } else {
      console.error('[Delete] Directory does not exist');
      return { success: false, error: '目录不存在' };
    }
  } catch (error) {
    console.error('[Delete] Failed to delete toolbox:', error);
    return { success: false, error: error.message };
  }
});

// 删除Everything
ipcMain.handle('delete-everything', (event, extractDir) => {
  try {
    console.log('[Delete] Deleting Everything from directory:', extractDir);
    
    // 检查目录是否存在
    if (fs.existsSync(extractDir)) {
      // 删除目录
      fs.rmSync(extractDir, { recursive: true });
      console.log('[Delete] Directory deleted successfully');
      
      // 清除本地数据
      const localData = readLocalData();
      if (localData.everythingExtractDir === extractDir) {
        delete localData.everythingExtractDir;
        const saveResult = saveLocalData(localData);
        if (!saveResult) {
          console.error('[Delete] Failed to save local data after deletion');
          return { success: false, error: '无法保存本地数据' };
        }
      }
      
      return { success: true };
    } else {
      console.error('[Delete] Directory does not exist');
      return { success: false, error: '目录不存在' };
    }
  } catch (error) {
    console.error('[Delete] Failed to delete Everything:', error);
    return { success: false, error: error.message };
  }
});

// 获取本地数据
ipcMain.handle('get-local-data', () => {
  console.log('[Data] Getting local data');
  const data = readLocalData();
  console.log('[Data] Returning local data:', JSON.stringify(data, null, 2));
  return data;
});

// 保存解压目录到本地数据
ipcMain.handle('save-extract-dir', (event, extractDir, key = 'extractDir') => {
  console.log('[Data] Saving extract directory:', extractDir, 'with key:', key);
  const localData = readLocalData();
  localData[key] = extractDir;
  const result = saveLocalData(localData);
  console.log('[Data] Save result:', result);
  return result;
});

// 保存本地数据
ipcMain.handle('save-local-data', async (event, data) => {
  try {
    console.log('[Data] Saving local data:', JSON.stringify(data, null, 2));
    const userDataPath = app.getPath('userData');
    const dataPath = path.join(userDataPath, 'local-data.json');
    
    // 确保目录存在
    await fs.promises.mkdir(userDataPath, { recursive: true });
    
    // 写入数据
    await fs.promises.writeFile(dataPath, JSON.stringify(data, null, 2));
    console.log('[Data] Local data saved successfully');
    return { success: true };
  } catch (error) {
    console.error('[Data] Failed to save local data:', error);
    return { success: false, error: error.message };
  }
});

// 选择壁纸
ipcMain.handle('select-wallpaper', async () => {
  try {
    console.log('[Wallpaper] Selecting wallpaper');
    
    // 创建文件选择对话框，只支持图片格式
    const result = await dialog.showOpenDialog({
      title: '选择壁纸',
      filters: [
        { name: '图片', extensions: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'] },
        { name: '所有文件', extensions: ['*'] }
      ],
      properties: ['openFile']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const wallpaperPath = result.filePaths[0];
      console.log('[Wallpaper] Selected wallpaper:', wallpaperPath);
      return { success: true, path: wallpaperPath };
    } else {
      console.log('[Wallpaper] Wallpaper selection canceled');
      return { success: false, error: '用户取消选择' };
    }
  } catch (error) {
    console.error('[Wallpaper] Failed to select wallpaper:', error);
    return { success: false, error: error.message };
  }
});

// 窗口控制功能
ipcMain.handle('minimize-window', () => {
  console.log('[Window] Minimizing window');
  if (mainWindow) {
    mainWindow.minimize();
  }
});

ipcMain.handle('maximize-window', () => {
  console.log('[Window] Toggling maximize state');
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      console.log('[Window] Unmaximizing window');
      mainWindow.unmaximize();
    } else {
      console.log('[Window] Maximizing window');
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('close-window', () => {
  console.log('[Window] Closing window');
  if (mainWindow) {
    mainWindow.close();
  }
});

// 运行VS Code
ipcMain.handle('run-vscode', (event, installDir) => {
  try {
    console.log('[Run] Running VS Code from directory:', installDir);
    
    // 查找Code.exe
    const vscodeExe = path.join(installDir, 'Code.exe');
    
    // 检查exe文件是否存在
    if (fs.existsSync(vscodeExe)) {
      console.log('[Run] Launching Code.exe:', vscodeExe);
      // 运行exe文件
      const childProcess = spawn(vscodeExe, [], { detached: true, stdio: 'ignore' });
      // 保存进程ID以便后续关闭
      global.vscodeProcess = childProcess;
      return { success: true, pid: childProcess.pid };
    } else {
      console.error('[Run] Code.exe not found in directory:', vscodeExe);
      return { success: false, error: '在安装目录中未找到Code.exe文件' };
    }
  } catch (error) {
    console.error('[Run] Failed to run VS Code:', error);
    return { success: false, error: error.message };
  }
});

// 关闭VS Code进程
ipcMain.handle('close-vscode', () => {
  try {
    console.log('[Close] Closing VS Code process');
    if (global.vscodeProcess) {
      const pid = global.vscodeProcess.pid;
      console.log('[Close] VS Code process PID:', pid);
      
      // 尝试优雅地关闭进程
      global.vscodeProcess.kill('SIGTERM');
      
      // 等待一段时间后强制关闭
      setTimeout(() => {
        try {
          if (global.vscodeProcess && !global.vscodeProcess.killed) {
            // Windows下使用taskkill命令强制关闭进程
            console.log('[Close] Force killing VS Code process with PID:', pid);
            const killProcess = spawn('taskkill', ['/PID', pid.toString(), '/F'], { stdio: 'ignore' });
            killProcess.on('close', (code) => {
              console.log('[Close] taskkill process closed with code:', code);
              if (code === 0) {
                console.log('[Close] VS Code process forcefully terminated successfully');
              } else {
                console.log('[Close] taskkill process exited with code:', code);
              }
            });
            killProcess.on('error', (error) => {
              console.error('[Close] Error executing taskkill command:', error);
            });
          }
        } catch (error) {
          console.error('[Close] Error force killing VS Code process:', error);
        }
      }, 2000);
      
      // 清除进程引用
      global.vscodeProcess = null;
      console.log('[Close] VS Code process closed successfully');
      return { success: true };
    } else {
      console.log('[Close] No VS Code process found, trying to kill by name');
      // 如果没有进程引用，尝试通过任务管理器关闭
      try {
        console.log('[Close] Killing VS Code process by name: Code.exe');
        const killProcess = spawn('taskkill', ['/IM', 'Code.exe', '/F'], { stdio: 'ignore' });
        killProcess.on('close', (code) => {
          console.log('[Close] taskkill by name closed with code:', code);
          if (code === 0) {
            console.log('[Close] VS Code process terminated by name successfully');
          } else {
            console.log('[Close] taskkill by name exited with code:', code);
          }
        });
        killProcess.on('error', (error) => {
          console.error('[Close] Error executing taskkill by name:', error);
        });
        return { success: true };
      } catch (error) {
        console.error('[Close] Error killing VS Code process by name:', error);
        return { success: true }; // 即使出错也返回成功，因为进程可能已经关闭
      }
    }
  } catch (error) {
    console.error('[Close] Failed to close VS Code process:', error);
    return { success: false, error: error.message };
  }
});

// 选择目录
ipcMain.handle('select-dir', async (event, type) => {
  try {
    console.log(`[Dir] Selecting directory for ${type}`);
    
    // 创建目录选择对话框
    const result = await dialog.showOpenDialog({
      title: '选择目录',
      properties: ['openDirectory']
    });
    
    if (!result.canceled && result.filePaths.length > 0) {
      const selectedPath = result.filePaths[0];
      console.log(`[Dir] Selected directory for ${type}:`, selectedPath);
      return { success: true, path: selectedPath };
    } else {
      console.log(`[Dir] Directory selection canceled for ${type}`);
      return { success: false, error: '用户取消选择' };
    }
  } catch (error) {
    console.error(`[Dir] Failed to select directory for ${type}:`, error);
    return { success: false, error: error.message };
  }
});

// 安装VS Code
ipcMain.handle('install', async (event, type) => {
  try {
    console.log(`[Install] Installing ${type}`);
    
    if (type === 'vscode') {
      // VS Code是通过下载安装程序来安装的，这里只是提示用户
      console.log('[Install] VS Code needs to be installed manually');
      return { success: true, message: '请运行下载的安装程序来安装VS Code' };
    }
    
    // 其他类型的安装处理
    return { success: false, error: '未知的安装类型' };
  } catch (error) {
    console.error(`[Install] Failed to install ${type}:`, error);
    return { success: false, error: error.message };
  }
});

// 删除目录
ipcMain.handle('delete-dir', async (event, type) => {
  try {
    console.log(`[Delete] Deleting directory for ${type}`);
    
    // 获取本地数据以获取目录路径
    const localData = readLocalData();
    let dirPath = '';
    
    switch (type) {
      case 'vscode':
        dirPath = localData.vscodeInstallDir || '';
        break;
      case 'node':
        dirPath = localData.nodeExtractDir || '';
        break;
      case 'extract':
        dirPath = localData.extractDir || '';
        break;
      case 'everything':
        dirPath = localData.everythingExtractDir || '';
        break;
      case '7z':
        dirPath = localData.sevenZipInstallDir || '';
        break;
      default:
        console.error(`[Delete] Unknown type: ${type}`);
        return { success: false, error: '未知的类型' };
    }
    
    if (!dirPath) {
      console.error(`[Delete] No directory path found for ${type}`);
      return { success: false, error: '未找到目录路径' };
    }
    
    // 检查目录是否存在
    if (!fs.existsSync(dirPath)) {
      console.error(`[Delete] Directory does not exist: ${dirPath}`);
      return { success: false, error: '目录不存在' };
    }
    
    // 删除目录
    await fs.promises.rm(dirPath, { recursive: true, force: true });
    console.log(`[Delete] Directory deleted successfully: ${dirPath}`);
    
    // 从本地数据中移除目录路径
    delete localData[`${type}InstallDir`];
    delete localData[`${type}ExtractDir`];
    saveLocalData(localData);
    
    return { success: true };
  } catch (error) {
    console.error(`[Delete] Failed to delete directory for ${type}:`, error);
    return { success: false, error: error.message };
  }
});
