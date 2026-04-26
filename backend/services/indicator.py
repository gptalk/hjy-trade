import pandas as pd
import numpy as np

def calculate_indicators(df):
    """计算技术指标"""
    # 如果有DatetimeIndex但有timezone，转换为无timezone
    if hasattr(df.index, 'tz') and df.index.tz is not None:
        df.index = df.index.tz_localize(None)

    # 使用numpy数组进行计算，避免索引问题
    close = df['Close'].values if 'Close' in df.columns else df['close'].values
    high = df['High'].values if 'High' in df.columns else df['high'].values
    low = df['Low'].values if 'Low' in df.columns else df['low'].values

    close_series = pd.Series(close, index=df.index)

    # MA (移动平均线)
    ma5 = close_series.rolling(window=5).mean()
    ma10 = close_series.rolling(window=10).mean()
    ma20 = close_series.rolling(window=20).mean()

    # EXPMA (指数移动平均线)
    expma12 = close_series.ewm(span=12, adjust=False).mean()
    expma26 = close_series.ewm(span=26, adjust=False).mean()

    # MACD
    macd = expma12 - expma26
    macd_signal = macd.ewm(span=9, adjust=False).mean()
    macd_hist = macd - macd_signal

    # KDJ
    n = 9
    k_vals = np.zeros(len(close))
    d_vals = np.zeros(len(close))
    k_vals[0] = 50
    d_vals[0] = 50

    for i in range(1, len(close)):
        rsv = (close[i] - np.min(low[max(0, i-n):i+1])) / (np.max(high[max(0, i-n):i+1]) - np.min(low[max(0, i-n):i+1]) + 1e-10) * 100
        k_vals[i] = 2/3 * k_vals[i-1] + 1/3 * rsv
        d_vals[i] = 2/3 * d_vals[i-1] + 1/3 * k_vals[i]

    j_vals = 3 * k_vals - 2 * d_vals
    kdj_k = pd.Series(k_vals, index=df.index)
    kdj_d = pd.Series(d_vals, index=df.index)
    kdj_j = pd.Series(j_vals, index=df.index)

    # RSI
    delta = pd.Series(close).diff()
    gain = delta.where(delta > 0, 0).rolling(window=6).mean()
    loss = (-delta.where(delta < 0, 0)).rolling(window=6).mean()
    rs = gain / (loss + 1e-10)
    rsi6 = 100 - (100 / (1 + rs))

    gain12 = delta.where(delta > 0, 0).rolling(window=12).mean()
    loss12 = (-delta.where(delta < 0, 0)).rolling(window=12).mean()
    rs12 = gain12 / (loss12 + 1e-10)
    rsi12 = 100 - (100 / (1 + rs12))

    # 布林带
    bb_middle = close_series.rolling(window=20).mean()
    bb_std = close_series.rolling(window=20).std()
    bb_upper = bb_middle + 2 * bb_std
    bb_lower = bb_middle - 2 * bb_std

    # 赋值到DataFrame
    df['MA5'] = ma5.values
    df['MA10'] = ma10.values
    df['MA20'] = ma20.values
    df['EXPMA12'] = expma12.values
    df['EXPMA26'] = expma26.values
    df['MACD'] = macd.values
    df['MACD_signal'] = macd_signal.values
    df['MACD_hist'] = macd_hist.values
    df['KDJ_K'] = kdj_k.values
    df['KDJ_D'] = kdj_d.values
    df['KDJ_J'] = kdj_j.values
    df['RSI6'] = rsi6.values
    df['RSI12'] = rsi12.values
    df['BB_upper'] = bb_upper.values
    df['BB_middle'] = bb_middle.values
    df['BB_lower'] = bb_lower.values

    return df
