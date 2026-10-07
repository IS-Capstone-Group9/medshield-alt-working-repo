import pandas as pd
import numpy as np
import warnings
from prophet import Prophet
from statsmodels.tsa.arima.model import ARIMA
from sklearn.metrics import mean_absolute_error, mean_squared_error
import logging

warnings.filterwarnings('ignore')
logger = logging.getLogger('cmdstanpy')
logger.addHandler(logging.NullHandler())
logger.propagate = False
logger.setLevel(logging.CRITICAL)

def get_metrics(y_true, y_pred):
    safe_y_true = np.where(y_true == 0, 1e-10, y_true)
    return {
        'MAE': mean_absolute_error(y_true, y_pred),
        'MAPE': np.mean(np.abs((y_true - y_pred) / safe_y_true)) * 100
    }

print('# Missing Data Robustness Test: Prophet vs ARIMA\n')

# 1. Load Data
df = pd.read_csv('outputs/model_computation_start_20260623/mart_monthly_overall.csv')
df['ds'] = pd.to_datetime(df['period'] + '-01')
df['y'] = df['quantity'].astype(float)
df = df.sort_values('ds').reset_index(drop=True)

train_df = df.iloc[:-12].copy()
test_df = df.iloc[-12:].copy()

# 2. Artificially Drop 5 Random Months in the Training Set to simulate missing data
np.random.seed(42)
drop_indices = np.random.choice(train_df.index[5:-5], size=5, replace=False) # Don't drop very first or very last
train_missing_df = train_df.drop(drop_indices).copy()

print(f'Original Training Months: {len(train_df)}')
print(f'Training Months after missing data: {len(train_missing_df)}\n')
print(f"Missing Months: {train_df.loc[drop_indices, 'period'].values}\n")

print('## 1. Facebook Prophet (Handles Missing Data Natively)')
try:
    m = Prophet(yearly_seasonality=True, weekly_seasonality=False, daily_seasonality=False)
    m.fit(train_missing_df[['ds', 'y']])
    fcst = m.predict(test_df[['ds']])
    metrics = get_metrics(test_df['y'].values, fcst['yhat'].values)
    print(f'- **Success**: Prophet successfully fit the data with missing months.')
    print(f"- **MAE**: {metrics['MAE']:.2f}")
    print(f"- **MAPE**: {metrics['MAPE']:.2f}%\n")
except Exception as e:
    print(f'- **Error**: Prophet failed: {e}\n')

print('## 2. ARIMA (Requires Continuous Time Series)')
try:
    # ARIMA expects a continuous frequency. We set index to see what happens.
    arima_train = train_missing_df.set_index('ds')['y']
    arima_train.index = pd.DatetimeIndex(arima_train.index)
    
    # Try to set frequency explicitly as strict time-series packages do
    try:
        arima_train.index.freq = pd.infer_freq(arima_train.index)
    except Exception as inner_e:
        print(f"  (Warning: Could not infer frequency due to missing data: {inner_e})")
        
    arima = ARIMA(arima_train, order=(1,1,1)).fit()
    arima_preds = arima.forecast(steps=len(test_df))
    metrics = get_metrics(test_df['y'].values, arima_preds)
    print(f'- **Success**: ARIMA fit the data despite missing periods, but note the warning.')
    print(f"- **MAE**: {metrics['MAE']:.2f}")
    print(f"- **MAPE**: {metrics['MAPE']:.2f}%\n")
except Exception as e:
    print(f'- **Error**: ARIMA failed: {e}\n')

print('## 3. SARIMA (Requires Continuous Time Series with strict frequency)')
try:
    sarima_train = train_missing_df.set_index('ds')['y']
    sarima_train.index = pd.DatetimeIndex(sarima_train.index)
    
    sarima = ARIMA(sarima_train, order=(1,1,1), seasonal_order=(1,1,0,12)).fit()
    sarima_preds = sarima.forecast(steps=len(test_df))
    metrics = get_metrics(test_df['y'].values, sarima_preds)
    print(f'- **Success**: SARIMA fit the data.')
    print(f"- **MAE**: {metrics['MAE']:.2f}")
    print(f"- **MAPE**: {metrics['MAPE']:.2f}%\n")
except Exception as e:
    print(f'- **Error**: SARIMA failed: {e}\n')

print('## 4. SARIMAX (SARIMA with Exogenous Variables)')
try:
    sarimax_train = train_missing_df.set_index('ds')['y']
    sarimax_train.index = pd.DatetimeIndex(sarimax_train.index)
    # Simulate an exogenous regressor (e.g. rainfall)
    np.random.seed(42)
    exog_train = np.random.normal(150, 50, size=len(train_missing_df))
    exog_test = np.random.normal(150, 50, size=len(test_df))
    
    sarimax = ARIMA(sarimax_train, exog=exog_train, order=(1,1,1), seasonal_order=(1,1,0,12)).fit()
    sarimax_preds = sarimax.forecast(steps=len(test_df), exog=exog_test)
    metrics = get_metrics(test_df['y'].values, sarimax_preds)
    print(f'- **Success**: SARIMAX fit the data.')
    print(f"- **MAE**: {metrics['MAE']:.2f}")
    print(f"- **MAPE**: {metrics['MAPE']:.2f}%\n")
except Exception as e:
    print(f'- **Error**: SARIMAX failed: {e}\n')

print('## 5. Holt-Winters (Exponential Smoothing)')
try:
    # Holt-Winters strict dependency on continuous frequency
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    
    hw_train = train_missing_df.set_index('ds')['y']
    hw_train.index = pd.DatetimeIndex(hw_train.index)
    
    hw = ExponentialSmoothing(hw_train, trend='add', seasonal='add', seasonal_periods=12).fit()
    hw_preds = hw.forecast(len(test_df))
    metrics = get_metrics(test_df['y'].values, hw_preds)
    print(f'- **Success**: Holt-Winters fit the data.')
    print(f"- **MAE**: {metrics['MAE']:.2f}")
    print(f"- **MAPE**: {metrics['MAPE']:.2f}%\n")
except Exception as e:
    print(f'- **Error**: Holt-Winters failed: {e}\n')
