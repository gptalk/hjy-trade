import pandas as pd
import pandas_ta as ta

def calculate_indicators(df):
    """计算技术指标"""
    # MA
    df['MA5'] = ta.sma(df['close'], length=5)
    df['MA10'] = ta.sma(df['close'], length=10)
    df['MA20'] = ta.sma(df['close'], length=20)

    # EXPMA
    df['EXPMA12'] = ta.ema(df['close'], length=12)
    df['EXPMA26'] = ta.ema(df['close'], length=26)

    # MACD
    macd = ta.macd(df['close'])
    df['MACD'] = macd['MACD_12_26_9']
    df['MACD_signal'] = macd['MACDs_12_26_9']
    df['MACD_hist'] = macd['MACDh_12_26_9']

    # KDJ
    kdj = ta.kdj(df['high'], df['low'], df['close'])
    df['KDJ_K'] = kdj['KDJ_9_3_3']
    df['KDJ_D'] = kdj['KDJ_9_3_3']
    df['KDJ_J'] = kdj['KDJ_9_3_3']

    # RSI
    df['RSI6'] = ta.rsi(df['close'], length=6)
    df['RSI12'] = ta.rsi(df['close'], length=12)

    # 布林带
    bbands = ta.bbands(df['close'], length=20)
    df['BB_upper'] = bbands['BBU_20_2.0']
    df['BB_middle'] = bbands['BBM_20_2.0']
    df['BB_lower'] = bbands['BBL_20_2.0']

    return df
